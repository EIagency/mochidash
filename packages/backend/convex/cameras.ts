import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  query,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ---------------------------------------------------------------------------
// Speed cameras: read-through tile cache backed by OpenStreetMap / Overpass.
//
// The world is divided into 0.1-degree tiles (~11km). When the driver enters a
// new 3x3 tile block, the client calls `ensureTiles`; each stale tile is fetched
// from Overpass once, normalised, and written here. Subsequent drivers through
// the same tile read from the cache until it goes stale (7 days).
// ---------------------------------------------------------------------------

const STALE_MS = 7 * 24 * 60 * 60 * 1000;
const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export interface CameraDoc {
  _id: Id<"cameras">;
  _creationTime: number;
  osmId: string;
  tile: string;
  lat: number;
  lon: number;
  maxspeedMph?: number;
  direction?: string;
}

interface OverpassElement {
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements?: OverpassElement[];
}

// ---- client-facing --------------------------------------------------------

export const inTiles = query({
  args: { tiles: v.array(v.string()) },
  returns: v.array(
    v.object({
      _id: v.id("cameras"),
      _creationTime: v.number(),
      osmId: v.string(),
      tile: v.string(),
      lat: v.number(),
      lon: v.number(),
      maxspeedMph: v.optional(v.number()),
      direction: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    const groups = await Promise.all(
      args.tiles.map((tile) =>
        ctx.db
          .query("cameras")
          .withIndex("by_tile", (q) => q.eq("tile", tile))
          .collect(),
      ),
    );
    return groups.flat();
  },
});

export const ensureTiles = action({
  args: { tiles: v.array(v.string()) },
  returns: v.object({ fetched: v.number() }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const stale: string[] = await ctx.runQuery(
      internal.cameras.staleTiles,
      { tiles: args.tiles, staleBefore: now - STALE_MS },
    );

    let fetched = 0;
    for (const tile of stale) {
      const [tLat, tLon] = tile.split(":").map(Number);
      const bbox = `${tLat.toFixed(4)},${tLon.toFixed(4)},${(
        tLat + 0.1
      ).toFixed(4)},${(tLon + 0.1).toFixed(4)}`;

      let cameras: CameraInput[] = [];
      try {
        const res = await fetch(OVERPASS_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: `[out:json];node[highway=speed_camera](${bbox});out;`,
        });
        if (res.ok) {
          const data = (await res.json()) as OverpassResponse;
          cameras = (data.elements ?? [])
            .filter(
              (el) =>
                typeof el.lat === "number" && typeof el.lon === "number",
            )
            .map((el) => ({
              osmId: String(el.id),
              tile,
              lat: el.lat as number,
              lon: el.lon as number,
              maxspeedMph: parseMaxspeed(el.tags?.maxspeed),
              direction: el.tags?.direction,
            }));
        }
      } catch {
        // Overpass hiccup -- still mark the tile fetched so we do not hot-loop it.
      }

      await ctx.runMutation(internal.cameras.saveTile, {
        tile,
        cameras,
        fetchedAt: now,
      });
      fetched += 1;
    }
    return { fetched };
  },
});

interface CameraInput {
  osmId: string;
  tile: string;
  lat: number;
  lon: number;
  maxspeedMph?: number;
  direction?: string;
}

const cameraInputValidator = v.object({
  osmId: v.string(),
  tile: v.string(),
  lat: v.number(),
  lon: v.number(),
  maxspeedMph: v.optional(v.number()),
  direction: v.optional(v.string()),
});

// ---- internals ------------------------------------------------------------

export const staleTiles = internalQuery({
  args: { tiles: v.array(v.string()), staleBefore: v.number() },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const rows = await Promise.all(
      args.tiles.map((tile) =>
        ctx.db
          .query("cameraTiles")
          .withIndex("by_tile", (q) => q.eq("tile", tile))
          .unique(),
      ),
    );
    return args.tiles.filter((tile, i) => {
      const row = rows[i];
      return !row || row.fetchedAt < args.staleBefore;
    });
  },
});

export const saveTile = internalMutation({
  args: {
    tile: v.string(),
    cameras: v.array(cameraInputValidator),
    fetchedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("cameraTiles")
      .withIndex("by_tile", (q) => q.eq("tile", args.tile))
      .unique();

    if (existing) {
      const rows = await ctx.db
        .query("cameras")
        .withIndex("by_tile", (q) => q.eq("tile", args.tile))
        .collect();
      for (const row of rows) await ctx.db.delete(row._id);
      await ctx.db.patch(existing._id, {
        fetchedAt: args.fetchedAt,
        cameraCount: args.cameras.length,
      });
    } else {
      await ctx.db.insert("cameraTiles", {
        tile: args.tile,
        fetchedAt: args.fetchedAt,
        cameraCount: args.cameras.length,
      });
    }

    for (const cam of args.cameras) {
      await ctx.db.insert("cameras", cam);
    }
    return null;
  },
});

// ---- helpers --------------------------------------------------------------

export function parseMaxspeed(raw?: string): number | undefined {
  if (!raw) return undefined;
  const match = raw.match(/(\d+)/);
  if (!match) return undefined;
  const value = parseInt(match[1], 10);
  if (Number.isNaN(value)) return undefined;
  // OSM maxspeed is km/h unless the tag explicitly says mph
  return raw.includes("mph") ? value : Math.round(value / 1.60934);
}
