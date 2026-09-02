# MochiDash

## Status: in-progress

## Goal
Dash-mounted mochi companion: squishy character that reacts to driving (g-forces)
with 20+ expressions, plus OSM speed camera warnings cached server-side in Convex.

## Steps
- [x] Install native deps (sensors, location, audio, battery, keep-awake, svg, fonts)
- [ ] Convex backend: cameras + cameraTiles tables, Overpass tile cache
- [ ] Theme tokens + fonts (DM Sans / Nunito ExtraBold)
- [ ] MochiFace component (physics, 24 expressions, colourways, sfx)
- [ ] useSpeedCameras hook (tile block, bands, cone filter, banned-country geofence)
- [ ] Home screen (header, stage card, tiles, alert card, night dim)
- [ ] Settings modal (colourway, mute, silent-mode override, cameras, axis/re-level, HUD)
- [ ] SFX generation + wiring
- [ ] Verify: no TS/ESLint errors

## Decisions
- Port reference logic (gravity low-pass, spring physics, tile caching) but restructure:
  theme/lib/hooks split, TypeScript, no `any`, validators everywhere.
- Colourways recolor body + hard shadow + cheeks together; midnight uses light face ink.
- Face ink derives from colourway so dark bodies stay readable.
- Settings persisted via AsyncStorage (set-and-forget per driver-safety constraints).
- Camera warnings geofenced off in FR/DE/CH via reverse geocode of the tile-block anchor.
- Web preview: DeviceMotion unavailable → idle expressions cycle on a timer fallback.

## Known TODOs (per build prompt, intentionally left)
- Average-speed zones (OSM ways/relations) not handled — nodes only.
- Mobile camera vans are not in OSM.
- "Next turn" alert card content is placeholder UI until a nav API is wired.
