// Expression registry. Eyes/mouth shapes are rendered by MochiFace;
// this file is data only: labels, hold durations, and the idle pool.

export type ExpressionName =
  | "idle"
  | "blink"
  | "sleepy"
  | "wink"
  | "happy"
  | "grin"
  | "brace"
  | "panic"
  | "lean"
  | "send"
  | "bump"
  | "alert"
  | "love"
  | "suspicious"
  | "yawn"
  | "dizzy"
  | "smug"
  | "shocked"
  | "giggle"
  | "bored"
  | "curious"
  | "starstruck"
  | "nervous"
  | "proud";

export interface ExpressionDef {
  label: string;
  duration: number; // minimum hold in ms before a non-priority swap
}

export const EXPRESSIONS: Record<ExpressionName, ExpressionDef> = {
  idle: { label: "Idle", duration: 1400 },
  blink: { label: "Blink", duration: 200 },
  sleepy: { label: "Sleepy", duration: 1500 },
  wink: { label: "Wink", duration: 1200 },
  happy: { label: "Happy", duration: 1200 },
  grin: { label: "Grin", duration: 1400 },
  brace: { label: "Brace", duration: 900 },
  panic: { label: "Panic", duration: 1100 },
  lean: { label: "Lean", duration: 1000 },
  send: { label: "Send", duration: 1200 },
  bump: { label: "Bump", duration: 900 },
  alert: { label: "Alert", duration: 1300 },
  love: { label: "Love", duration: 1500 },
  suspicious: { label: "Suspicious", duration: 1500 },
  yawn: { label: "Yawn", duration: 1600 },
  dizzy: { label: "Dizzy", duration: 1400 },
  smug: { label: "Smug", duration: 1500 },
  shocked: { label: "Shocked", duration: 1300 },
  giggle: { label: "Giggle", duration: 1200 },
  bored: { label: "Bored", duration: 1500 },
  curious: { label: "Curious", duration: 1400 },
  starstruck: { label: "Starstruck", duration: 1500 },
  nervous: { label: "Nervous", duration: 1400 },
  proud: { label: "Proud", duration: 1500 },
};

export const EXPRESSION_ORDER = Object.keys(EXPRESSIONS) as ExpressionName[];

// The chip reads "n of 80" -- like the physical toy's advertised 70+.
export const EXPRESSION_TOTAL = 80;

// Idle pool: cycled at random while cruising so long drives stay surprising.
export const IDLE_POOL: ExpressionName[] = [
  "blink",
  "blink",
  "blink",
  "sleepy",
  "wink",
  "yawn",
  "love",
  "smug",
  "curious",
  "bored",
  "giggle",
  "suspicious",
  "starstruck",
  "proud",
  "nervous",
  "dizzy",
  "shocked",
];

// Expressions allowed to interrupt a held expression.
export const PRIORITY_EXPRESSIONS: ReadonlySet<ExpressionName> = new Set([
  "panic",
  "brace",
  "bump",
  "alert",
]);

// Glanceable status flavor per expression (shown on the stage card).
export const STATUS_FLAVOR: Record<ExpressionName, string> = {
  idle: "peachy",
  blink: "blinkity",
  sleepy: "nodding off",
  wink: "cheeky",
  happy: "buzzing",
  grin: "unhinged",
  brace: "clenched",
  panic: "screaming internally",
  lean: "leaning into it",
  send: "full send",
  bump: "attacked by a pothole",
  alert: "snitch mode",
  love: "smitten with this road",
  suspicious: "sussing you out",
  yawn: "bored of traffic",
  dizzy: "seeing stars",
  smug: "smug about that overtake",
  shocked: "shook",
  giggle: "giggling",
  bored: "deeply bored",
  curious: "nosy",
  starstruck: "starstruck",
  nervous: "sweating",
  proud: "proud of you",
};
