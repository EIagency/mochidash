// MochiDash design tokens -- ported from the web reference (theme.js).
// Warm, soft palette: cream background, coral character, no cold greys.

export const color = {
  background: "#FFF9F3",
  foreground: "#332B2B",
  primary: "#F47F78",
  primaryShadow: "#D96662", // hard drop under the blob
  secondary: "#F1E8E1",
  muted: "#EAE1DB",
  mutedForeground: "#897B77",
  accent: "#FFD9D2",
  accentForeground: "#6B3935",
  destructive: "#D85D5D",
  card: "#FFFFFF",
  border: "#E9DDD5",
  chart2: "#F6B36A",
};

export const radius = {
  card: 22,
  stage: 26,
  pill: 999,
};

export const font = {
  body: "DMSans_400Regular",
  bodyMedium: "DMSans_500Medium",
  bodyBold: "DMSans_700Bold",
  heading: "Nunito_800ExtraBold",
};

export const shadow = {
  card: "0px 1px 2px rgba(51, 43, 43, 0.06)",
  lift: "0px 2px 0px rgba(51, 43, 43, 0.08)",
};

// Colourways: the body, its hard shadow and the cheeks recolour together.
// `ink` is the face colour -- light on the midnight body so features read.
export type ColourwayKey = "coral" | "boostBlue" | "racerRed" | "midnight" | "sakura";

export interface Colourway {
  label: string;
  body: string;
  shadowColor: string;
  ink: string;
}

export const COLOURWAYS: Record<ColourwayKey, Colourway> = {
  coral: { label: "Coral", body: "#F47F78", shadowColor: "#D96662", ink: "#332B2B" },
  boostBlue: { label: "Boost Blue", body: "#5E97F6", shadowColor: "#3E72D6", ink: "#1F2A44" },
  racerRed: { label: "Racer Red", body: "#E84A4A", shadowColor: "#C02E2E", ink: "#2B1414" },
  midnight: { label: "Midnight Black", body: "#34343E", shadowColor: "#1E1E26", ink: "#FFF3EA" },
  sakura: { label: "Sakura Pink", body: "#F5A8BC", shadowColor: "#DB87A0", ink: "#3A2A2E" },
};

export const COLOURWAY_ORDER: ColourwayKey[] = [
  "coral",
  "boostBlue",
  "racerRed",
  "midnight",
  "sakura",
];
