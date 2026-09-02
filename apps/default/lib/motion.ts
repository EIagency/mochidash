// Motion configuration for the mochi physics engine.
//
// Portrait vent mount, screen facing the driver:
//   device X = lateral, Z = longitudinal, Y = vertical.
// Other mount styles are a one-line change here. Sign flips are also
// exposed live through settings (flipLateral / flipLongitudinal).

export interface AxisConfig {
  lateral: "x" | "y" | "z";
  longitudinal: "x" | "y" | "z";
  vertical: "x" | "y" | "z";
  signLateral: 1 | -1;
  signLongitudinal: 1 | -1;
  signVertical: 1 | -1;
}

export const AXIS: AxisConfig = {
  lateral: "x",
  longitudinal: "z",
  vertical: "y",
  signLateral: 1,
  signLongitudinal: 1,
  signVertical: 1,
};

export const G = 9.80665;

// Expression trigger thresholds, in g.
export const TH = {
  happy: 0.22,
  grin: 0.6,
  brace: -0.28,
  panic: -0.6,
  lean: 0.3,
  send: 0.6,
  bump: 0.55,
};

export const SPRING = { damping: 11, stiffness: 190, mass: 0.7 };

export const MAX = {
  throwX: 34,
  throwY: 18,
  rot: 10,
  eye: 10,
  squashX: 1.2,
  squashY: 0.82,
};

// Gravity low-pass: fast while settling (first 40 samples), then slow.
export const SETTLE_SAMPLES = 40;
export const ALPHA_SETTLING = 0.2;
export const ALPHA_SETTLED = 0.02;

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
