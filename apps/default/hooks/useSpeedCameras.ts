import { useEffect, useRef, useState } from "react";
import { useAction, useQuery } from "convex/react";
import * as Location from "expo-location";
import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { bearingDeg, delta, haversineMeters, tileBlock, tileKey } from "../lib/geo";

// ---------------------------------------------------------------------------
// Speed camera approach warnings.
//
// The client watches GPS, caches a 3x3 block of 0.1-degree tiles from Convex
// (devices NEVER hit Overpass directly), and fires warnings in three distance
// bands (600m / 300m / 140m), at most once per camera per pass, re-arming
// when 900m past.
//
// Legal: camera warning apps are banned in France, Germany and Switzerland --
// the feature geofences itself off in those countries.
// ---------------------------------------------------------------------------

const BANDS_M = [140, 300, 600]; // tightest first: first unfired band wins
const REARM_M = 900;
const CONE_DEG = 55;
const CONE_MIN_MPH = 7; // GPS heading is noise below this
const OVER_GRACE_MPH = 2;

// Countries where speed camera warning apps are banned.
const BANNED_ISO = new Set(["FR", "DE", "CH"]);

export interface CameraWarning {
  camera: Doc<"cameras">;
  distanceM: number;
  band: number;
  over: boolean;
  overBy: number;
}

export interface SpeedCamerasResult {
  warning: CameraWarning | null;
  speedMph: number;
  banned: boolean;
}

interface BandState {
  fired: Set<number>;
}

export function useSpeedCameras(enabled: boolean): SpeedCamerasResult {
  const [tiles, setTiles] = useState<string[] | null>(null);
  const [warning, setWarning] = useState<CameraWarning | null>(null);
  const [speedMph, setSpeedMph] = useState(0);
  const [banned, setBanned] = useState(false);

  const cameras = useQuery(
    api.cameras.inTiles,
    enabled && tiles ? { tiles } : "skip",
  );
  const ensureTiles = useAction(api.cameras.ensureTiles);

  const camerasRef = useRef<Doc<"cameras">[] | null>(null);
  camerasRef.current = cameras ?? null;

  const anchorTileRef = useRef<string | null>(null);
  const bandsRef = useRef<Map<string, BandState>>(new Map());
  const bannedRef = useRef(false);
  bannedRef.current = banned;

  // Geofence: reverse-geocode once per tile-block anchor (~11km cadence).
  const checkLegality = async (lat: number, lon: number) => {
    try {
      const places = await Location.reverseGeocodeAsync({
        latitude: lat,
        longitude: lon,
      });
      const iso = places[0]?.isoCountryCode?.toUpperCase();
      setBanned(iso != null && BANNED_ISO.has(iso));
    } catch {
      // Reverse geocode unavailable (web, offline) -- leave feature on.
    }
  };

  // Fetch any stale tiles in the active block.
  useEffect(() => {
    if (!enabled || !tiles || banned) return;
    ensureTiles({ tiles }).catch(() => {});
  }, [enabled, tiles, banned]);

  useEffect(() => {
    if (!enabled) {
      setWarning(null);
      setSpeedMph(0);
      return;
    }

    let cancelled = false;
    let sub: Location.LocationSubscription | null = null;

    const handleFix = (loc: Location.LocationObject) => {
      const { latitude: lat, longitude: lon } = loc.coords;
      const rawSpeed = loc.coords.speed;
      const mph =
        rawSpeed != null && rawSpeed > 0 ? rawSpeed * 2.23694 : 0;
      setSpeedMph(mph);

      // Crossed a tile boundary? Refetch the 3x3 block and re-check legality.
      const key = tileKey(lat, lon);
      if (key !== anchorTileRef.current) {
        anchorTileRef.current = key;
        setTiles(tileBlock(lat, lon));
        checkLegality(lat, lon);
      }

      if (bannedRef.current) {
        setWarning(null);
        return;
      }

      const cams = camerasRef.current;
      if (!cams) {
        setWarning(null);
        return;
      }

      const heading = loc.coords.heading;
      let best: { cam: Doc<"cameras">; dist: number; band: number } | null =
        null;

      for (const cam of cams) {
        const dist = haversineMeters(lat, lon, cam.lat, cam.lon);

        let entry = bandsRef.current.get(cam._id);
        if (!entry) {
          entry = { fired: new Set() };
          bandsRef.current.set(cam._id, entry);
        }
        if (dist > REARM_M && entry.fired.size > 0) entry.fired.clear();

        // Ahead-only cone, disabled at low speed where heading is noise.
        if (mph >= CONE_MIN_MPH && heading != null && heading >= 0) {
          const b = bearingDeg(lat, lon, cam.lat, cam.lon);
          if (Math.abs(delta(b - heading)) > CONE_DEG) continue;
        }

        let band = 0;
        for (const b of BANDS_M) {
          if (dist <= b && !entry.fired.has(b)) {
            band = b;
            break;
          }
        }
        if (band === 0) continue;
        if (!best || dist < best.dist) best = { cam, dist, band };
      }

      if (best) {
        bandsRef.current.get(best.cam._id)?.fired.add(best.band);
        const limit = best.cam.maxspeedMph;
        const over = limit != null && mph > limit + OVER_GRACE_MPH;
        setWarning({
          camera: best.cam,
          distanceM: best.dist,
          band: best.band,
          over,
          overBy: over ? Math.round(mph - (limit ?? 0)) : 0,
        });
      } else {
        setWarning(null);
      }
    };

    (async () => {
      try {
        const perm = await Location.requestForegroundPermissionsAsync();
        if (!perm.granted || cancelled) return;

        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (cancelled) return;
        handleFix(initial);

        sub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 5,
          },
          handleFix,
        );
      } catch {
        // Location denied / unavailable -- nothing crashes, no warnings.
      }
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [enabled]);

  return { warning, speedMph, banned };
}
