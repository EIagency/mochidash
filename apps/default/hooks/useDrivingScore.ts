import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

export interface DrivingScore {
  /** 0-100. Starts at 100, drops on harsh events, recovers with smooth driving. */
  score: number;
  harshBrakes: number;
  harshAccelerations: number;
}

// dv/dt thresholds in mph per second (1 mph/s ≈ 0.447 m/s²).
const HARSH_BRAKE_MPH_S = 6; // ≈ 2.7 m/s² deceleration
const HARSH_ACCEL_MPH_S = 4.5; // ≈ 2.0 m/s² acceleration
const MIN_SPEED_FOR_EVENTS_MPH = 8;
const EVENT_COOLDOWN_MS = 2500;
const BRAKE_PENALTY = 5;
const ACCEL_PENALTY = 2;
const RECOVER_EVERY_MS = 30_000;

/**
 * Session driving score derived from GPS speed deltas.
 * Harsh braking costs points, harsh acceleration costs fewer,
 * and sustained smooth driving slowly recovers the score toward 100.
 */
export function useDrivingScore(speedMph: number): DrivingScore {
  const [state, setState] = useState<DrivingScore>({
    score: 100,
    harshBrakes: 0,
    harshAccelerations: 0,
  });
  const prevRef = useRef<{ v: number; t: number } | null>(null);
  const dvdtEmaRef = useRef(0);
  const lastEventRef = useRef(0);
  const lastRecoverRef = useRef(Date.now());

  // Classify harsh events from GPS speed deltas (EMA-smoothed dv/dt).
  useEffect(() => {
    const now = Date.now();
    const prev = prevRef.current;
    prevRef.current = { v: speedMph, t: now };
    if (prev == null) return;
    const dt = (now - prev.t) / 1000;
    if (dt < 0.25) return;

    const dvdt = (speedMph - prev.v) / dt;
    dvdtEmaRef.current = dvdtEmaRef.current * 0.5 + dvdt * 0.5;

    if (now - lastEventRef.current < EVENT_COOLDOWN_MS) return;
    if (prev.v < MIN_SPEED_FOR_EVENTS_MPH) return;

    if (dvdtEmaRef.current <= -HARSH_BRAKE_MPH_S) {
      lastEventRef.current = now;
      lastRecoverRef.current = now;
      dvdtEmaRef.current = 0;
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(
          () => {},
        );
      }
      setState((s) => ({
        ...s,
        score: Math.max(0, s.score - BRAKE_PENALTY),
        harshBrakes: s.harshBrakes + 1,
      }));
    } else if (dvdtEmaRef.current >= HARSH_ACCEL_MPH_S) {
      lastEventRef.current = now;
      lastRecoverRef.current = now;
      dvdtEmaRef.current = 0;
      setState((s) => ({
        ...s,
        score: Math.max(0, s.score - ACCEL_PENALTY),
        harshAccelerations: s.harshAccelerations + 1,
      }));
    }
  }, [speedMph]);

  // Smooth driving recovers the score: +1 every 30 s above crawling speed.
  useEffect(() => {
    const t = setInterval(() => {
      const now = Date.now();
      if (
        speedMph > 5 &&
        now - lastEventRef.current > EVENT_COOLDOWN_MS &&
        now - lastRecoverRef.current >= RECOVER_EVERY_MS
      ) {
        lastRecoverRef.current = now;
        setState((s) =>
          s.score < 100 ? { ...s, score: Math.min(100, s.score + 1) } : s,
        );
      }
    }, 5000);
    return () => clearInterval(t);
  }, [speedMph]);

  return state;
}
