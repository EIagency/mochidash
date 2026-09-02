// Tile math for the camera cache + great-circle helpers.

export const TILE_DEG = 0.1;

export function tileKey(lat: number, lon: number): string {
  const tLat = Math.floor(lat / TILE_DEG) * TILE_DEG;
  const tLon = Math.floor(lon / TILE_DEG) * TILE_DEG;
  return `${tLat.toFixed(4)}:${tLon.toFixed(4)}`;
}

// 3x3 block of tiles around a position -- the unit the client caches.
export function tileBlock(lat: number, lon: number): string[] {
  const tLat = Math.floor(lat / TILE_DEG) * TILE_DEG;
  const tLon = Math.floor(lon / TILE_DEG) * TILE_DEG;
  const keys: string[] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      keys.push(
        `${(tLat + dx * TILE_DEG).toFixed(4)}:${(tLon + dy * TILE_DEG).toFixed(4)}`,
      );
    }
  }
  return keys;
}

const R = 6371000;
const toRad = (d: number) => (d * Math.PI) / 180;

export function haversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function bearingDeg(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const dLon = toRad(lon2 - lon1);
  const y = Math.sin(dLon) * Math.cos(toRad(lat2));
  const x =
    Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) -
    Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180) / Math.PI;
}

// Normalise to [-180, 180]
export function delta(deg: number): number {
  let d = deg;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}
