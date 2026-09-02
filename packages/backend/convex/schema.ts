import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The application schema. Auth tables are spread in; app tables below.
// Add new tables and indexes here as the app grows.

export default defineSchema({
  ...authTables,

  cameras: defineTable({
    osmId: v.string(),
    tile: v.string(), // "{tLat}:{tLon}" at 0.1 degree resolution
    lat: v.number(),
    lon: v.number(),
    maxspeedMph: v.optional(v.number()),
    direction: v.optional(v.string()),
  })
    .index("by_osmId", ["osmId"])
    .index("by_tile", ["tile"]),

  cameraTiles: defineTable({
    tile: v.string(),
    fetchedAt: v.number(),
    cameraCount: v.number(),
  }).index("by_tile", ["tile"]),
});
