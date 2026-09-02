import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { DeviceMotion, DeviceMotionMeasurement } from "expo-sensors";
import * as Haptics from "expo-haptics";
import { setAudioModeAsync, useAudioPlayer } from "expo-audio";
import { color, COLOURWAYS } from "../lib/theme";
import {
  EXPRESSIONS,
  ExpressionName,
  IDLE_POOL,
  PRIORITY_EXPRESSIONS,
} from "../lib/expressions";
import {
  ALPHA_SETTLED,
  ALPHA_SETTLING,
  AXIS,
  clamp,
  G,
  MAX,
  SETTLE_SAMPLES,
  SPRING,
  TH,
} from "../lib/motion";
import { useSettings } from "../lib/settings";
import type { CameraWarning } from "../hooks/useSpeedCameras";

// Generated sfx. Required statically so Metro bundles them; the players
// degrade to silence if playback fails.
const SFX = {
  go: require("../assets/audio/mochi-go.mp3"),
  woah: require("../assets/audio/mochi-woah.mp3"),
  yeee: require("../assets/audio/mochi-yeee.mp3"),
  ough: require("../assets/audio/mochi-ough.mp3"),
  mochi: require("../assets/audio/mochi-mochi.mp3"),
  camera: require("../assets/audio/mochi-camera.mp3"),
} as const;

type SfxKey = keyof typeof SFX;

export interface GReading {
  x: number; // lateral g
  y: number; // longitudinal g
  z: number; // vertical g
}

interface MochiFaceProps {
  paused: boolean;
  cameraWarning: CameraWarning | null;
  onExpression?: (name: ExpressionName) => void;
  onG?: (g: GReading) => void;
}

export default function MochiFace({
  paused,
  cameraWarning,
  onExpression,
  onG,
}: MochiFaceProps) {
  const { settings, relevelToken } = useSettings();
  const cw = COLOURWAYS[settings.colourway] ?? COLOURWAYS.coral;
  const ink = cw.ink;

  // ---- sfx players ----------------------------------------------------------
  const goPlayer = useAudioPlayer(SFX.go);
  const woahPlayer = useAudioPlayer(SFX.woah);
  const yeeePlayer = useAudioPlayer(SFX.yeee);
  const oughPlayer = useAudioPlayer(SFX.ough);
  const mochiPlayer = useAudioPlayer(SFX.mochi);
  const cameraPlayer = useAudioPlayer(SFX.camera);

  const playersRef = useRef({
    go: goPlayer,
    woah: woahPlayer,
    yeee: yeeePlayer,
    ough: oughPlayer,
    mochi: mochiPlayer,
    camera: cameraPlayer,
  });
  playersRef.current = {
    go: goPlayer,
    woah: woahPlayer,
    yeee: yeeePlayer,
    ough: oughPlayer,
    mochi: mochiPlayer,
    camera: cameraPlayer,
  };

  const sfxCooldown = useRef<Record<string, number>>({});

  // Respect the iOS silent switch by default; user override lives in settings.
  useEffect(() => {
    setAudioModeAsync({
      playsInSilentMode: settings.playInSilentMode,
      interruptionMode: "duckOthers",
    }).catch(() => {});
  }, [settings.playInSilentMode]);

  // ---- expression state (React) + physics (shared values) -------------------
  const [expr, setExprState] = useState<ExpressionName>("idle");
  const exprRef = useRef<ExpressionName>("idle");
  const exprSinceRef = useRef(Date.now());

  const throwX = useSharedValue(0);
  const throwY = useSharedValue(0);
  const rot = useSharedValue(0);
  const eyeX = useSharedValue(0);
  const squashX = useSharedValue(1);
  const squashY = useSharedValue(1);

  // refs for values read inside the 50Hz motion callback
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const warningRef = useRef<CameraWarning | null>(cameraWarning);
  warningRef.current = cameraWarning;
  const onExpressionRef = useRef(onExpression);
  onExpressionRef.current = onExpression;
  const onGRef = useRef(onG);
  onGRef.current = onG;

  const gravRef = useRef({ x: 0, y: 0, z: 0 });
  const settleRef = useRef(0);
  const bumpArmedRef = useRef(true);
  const hapticCooldown = useRef<Record<string, number>>({});
  const sampleRef = useRef(0);

  const canSet = (priority: boolean): boolean => {
    if (priority) return true;
    const held =
      Date.now() - exprSinceRef.current >
      (EXPRESSIONS[exprRef.current]?.duration ?? 1000);
    return held;
  };

  const setExpr = (name: ExpressionName, priority = false) => {
    if (!canSet(priority || PRIORITY_EXPRESSIONS.has(name))) return;
    if (exprRef.current === name) {
      exprSinceRef.current = Date.now();
      return;
    }
    exprRef.current = name;
    exprSinceRef.current = Date.now();
    setExprState(name);
    onExpressionRef.current?.(name);
  };

  const playSfx = (key: SfxKey) => {
    if (settingsRef.current.muted) return;
    const now = Date.now();
    if (now - (sfxCooldown.current[key] ?? 0) < 2500) return;
    sfxCooldown.current[key] = now;
    const player = playersRef.current[key];
    try {
      player.seekTo(0);
      player.play();
    } catch {
      // missing or unplayable file must fail silently
    }
  };

  const haptic = (kind: "light" | "warning") => {
    if (Platform.OS === "web") return;
    const now = Date.now();
    if (now - (hapticCooldown.current[kind] ?? 0) < 2500) return;
    hapticCooldown.current[kind] = now;
    if (kind === "light") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    } else {
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Warning,
      ).catch(() => {});
    }
  };

  const recalibrate = () => {
    settleRef.current = 0;
    gravRef.current = { x: 0, y: 0, z: 0 };
    throwX.value = 0;
    throwY.value = 0;
    rot.value = 0;
    eyeX.value = 0;
    squashX.value = 1;
    squashY.value = 1;
  };

  // Long-press / settings "re-level"
  const relevelRef = useRef(relevelToken);
  useEffect(() => {
    if (relevelToken !== relevelRef.current) {
      relevelRef.current = relevelToken;
      recalibrate();
    }
  }, [relevelToken]);

  // Pause: relax physics, mochi naps.
  useEffect(() => {
    if (paused) {
      throwX.value = withSpring(0, SPRING);
      throwY.value = withSpring(0, SPRING);
      rot.value = withSpring(0, SPRING);
      eyeX.value = withSpring(0, SPRING);
      squashX.value = withSpring(1, SPRING);
      squashY.value = withSpring(1, SPRING);
      exprRef.current = "idle";
      setExpr("sleepy", true);
    }
  }, [paused]);

  // ---- the 50Hz motion loop --------------------------------------------------
  useEffect(() => {
    // Web preview (and devices without motion): idle expressions on a timer.
    if (Platform.OS === "web") {
      const interval = setInterval(() => {
        const warning = warningRef.current;
        if (warning) {
          setExpr(warning.over ? "panic" : "alert", true);
          return;
        }
        if (!pausedRef.current && canSet(false)) {
          setExpr(IDLE_POOL[Math.floor(Math.random() * IDLE_POOL.length)]);
        }
      }, 4000);
      return () => clearInterval(interval);
    }

    DeviceMotion.setUpdateInterval(20);
    const sub = DeviceMotion.addListener((data: DeviceMotionMeasurement) => {
      const aig = data.accelerationIncludingGravity;
      // Never use data.acceleration -- null on a lot of Android hardware.
      if (!aig || aig.x == null || aig.y == null || aig.z == null) return;

      const grav = gravRef.current;
      const alpha = settleRef.current < SETTLE_SAMPLES ? ALPHA_SETTLING : ALPHA_SETTLED;
      grav.x += (aig.x - grav.x) * alpha;
      grav.y += (aig.y - grav.y) * alpha;
      grav.z += (aig.z - grav.z) * alpha;
      settleRef.current += 1;
      if (settleRef.current < SETTLE_SAMPLES) return;

      const s = settingsRef.current;
      const raw = {
        x: (aig.x - grav.x) / G,
        y: (aig.y - grav.y) / G,
        z: (aig.z - grav.z) / G,
      };
      const g: GReading = {
        x:
          raw[AXIS.lateral] *
          AXIS.signLateral *
          (s.flipLateral ? -1 : 1),
        y:
          raw[AXIS.longitudinal] *
          AXIS.signLongitudinal *
          (s.flipLongitudinal ? -1 : 1),
        z: raw[AXIS.vertical] * AXIS.signVertical,
      };

      sampleRef.current += 1;
      if (onGRef.current && sampleRef.current % 3 === 0) onGRef.current(g);

      if (pausedRef.current) return;

      const latX = g.x;
      const longX = g.y;
      const vert = g.z;

      throwX.value = withSpring(
        clamp((latX / TH.send) * MAX.throwX, -MAX.throwX, MAX.throwX),
        SPRING,
      );
      rot.value = withSpring(
        clamp((latX / TH.send) * MAX.rot, -MAX.rot, MAX.rot),
        SPRING,
      );
      eyeX.value = withSpring(
        clamp((latX / TH.send) * MAX.eye, -MAX.eye, MAX.eye),
        SPRING,
      );
      throwY.value = withSpring(
        clamp((-longX / TH.grin) * MAX.throwY, -MAX.throwY, MAX.throwY),
        SPRING,
      );
      const sq = clamp(Math.abs(longX) / TH.grin, 0, 1);
      squashX.value = withSpring(1 + sq * (MAX.squashX - 1), SPRING);
      squashY.value = withSpring(1 - sq * (1 - MAX.squashY), SPRING);

      const warning = warningRef.current;
      if (warning) {
        setExpr(warning.over ? "panic" : "alert", true);
        playSfx("camera");
        haptic("warning");
        return;
      }

      if (vert > TH.bump && bumpArmedRef.current) {
        bumpArmedRef.current = false;
        setExpr("bump", true);
        playSfx("ough");
        haptic("light");
      } else if (vert < 0.25) {
        bumpArmedRef.current = true;
      }

      if (longX < TH.panic) {
        setExpr("panic", true);
        playSfx("woah");
      } else if (longX < TH.brace) {
        setExpr("brace", true);
        playSfx("woah");
      } else if (longX > TH.grin) {
        setExpr("grin");
        playSfx("go");
      } else if (longX > TH.happy) {
        setExpr("happy");
        playSfx("go");
      } else if (Math.abs(latX) > TH.send) {
        setExpr("send");
        playSfx("yeee");
      } else if (Math.abs(latX) > TH.lean) {
        setExpr("lean");
      } else if (Math.random() < 0.006 && canSet(false)) {
        const next = IDLE_POOL[Math.floor(Math.random() * IDLE_POOL.length)];
        setExpr(next);
        if (next === "giggle" || next === "love") playSfx("mochi");
      }
    });
    return () => sub.remove();
  }, []);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: throwX.value },
      { translateY: throwY.value },
      { rotate: `${rot.value}deg` },
      { scaleX: squashX.value },
      { scaleY: squashY.value },
    ],
  }));

  const eyeShiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: eyeX.value }],
  }));

  return (
    <View style={s.stage}>
      {/* The hard offset shadow lives INSIDE the animated wrapper so it
          squashes and throws with the body. */}
      <Animated.View style={[s.bodyWrap, bodyStyle]}>
        <View style={[s.shadowBlob, { backgroundColor: cw.shadowColor }]} />
        <View
          style={[
            s.cheekShadow,
            s.cheekShadowL,
            { backgroundColor: cw.shadowColor },
          ]}
        />
        <View
          style={[
            s.cheekShadow,
            s.cheekShadowR,
            { backgroundColor: cw.shadowColor },
          ]}
        />
        <View style={[s.cheek, s.cheekL, { backgroundColor: cw.body }]} />
        <View style={[s.cheek, s.cheekR, { backgroundColor: cw.body }]} />
        <View style={[s.body, { backgroundColor: cw.body }]}>
          <Text style={s.sparkle}>✦</Text>
          <Animated.View style={[s.eyesRow, eyeShiftStyle]}>
            <Eye variant={EYE_MAP[expr][0]} ink={ink} side="l" />
            <Eye variant={EYE_MAP[expr][1]} ink={ink} side="r" />
          </Animated.View>
          <View style={s.mouthWrap}>
            <Mouth variant={MOUTH_MAP[expr]} ink={ink} />
          </View>
          <View style={[s.blush, s.blushL]} />
          <View style={[s.blush, s.blushR]} />
        </View>
      </Animated.View>
      <View style={s.ground} />
    </View>
  );
}

// ---- face pieces ------------------------------------------------------------

type EyeVariant =
  | "dot"
  | "dotGlint"
  | "bar"
  | "barTilt"
  | "arcUp"
  | "arcDown"
  | "wide"
  | "half"
  | "x"
  | "star"
  | "heart";

const EYE_MAP: Record<ExpressionName, [EyeVariant, EyeVariant]> = {
  idle: ["dot", "dot"],
  blink: ["bar", "bar"],
  sleepy: ["arcDown", "arcDown"],
  wink: ["dot", "bar"],
  happy: ["arcUp", "arcUp"],
  grin: ["arcUp", "arcUp"],
  brace: ["dotGlint", "dotGlint"],
  panic: ["wide", "wide"],
  lean: ["dot", "dot"],
  send: ["arcUp", "arcUp"],
  bump: ["wide", "wide"],
  alert: ["wide", "wide"],
  love: ["heart", "heart"],
  suspicious: ["half", "dot"],
  yawn: ["bar", "bar"],
  dizzy: ["x", "x"],
  smug: ["barTilt", "barTilt"],
  shocked: ["wide", "wide"],
  giggle: ["arcUp", "arcUp"],
  bored: ["bar", "bar"],
  curious: ["arcUp", "dot"],
  starstruck: ["star", "star"],
  nervous: ["dotGlint", "dotGlint"],
  proud: ["arcUp", "arcUp"],
};

function Eye({
  variant,
  ink,
  side,
}: {
  variant: EyeVariant;
  ink: string;
  side: "l" | "r";
}) {
  switch (variant) {
    case "dot":
      return <View style={[es.dot, { backgroundColor: ink }]} />;
    case "dotGlint":
      return (
        <View style={[es.dot, { backgroundColor: ink }]}>
          <View style={es.glint} />
        </View>
      );
    case "bar":
      return <View style={[es.bar, { backgroundColor: ink }]} />;
    case "barTilt":
      return (
        <View
          style={[
            es.bar,
            {
              backgroundColor: ink,
              transform: [{ rotate: side === "l" ? "-10deg" : "10deg" }],
            },
          ]}
        />
      );
    case "arcUp":
      return <View style={[es.arc, { borderTopColor: ink }]} />;
    case "arcDown":
      return <View style={[es.arcDown, { borderBottomColor: ink }]} />;
    case "wide":
      return <View style={[es.wide, { borderColor: ink }]} />;
    case "half":
      return <View style={[es.half, { backgroundColor: ink }]} />;
    case "x":
      return (
        <View style={es.xWrap}>
          <View
            style={[
              es.xBar,
              { backgroundColor: ink, transform: [{ rotate: "45deg" }] },
            ]}
          />
          <View
            style={[
              es.xBar,
              {
                backgroundColor: ink,
                transform: [{ rotate: "-45deg" }],
                position: "absolute",
              },
            ]}
          />
        </View>
      );
    case "star":
      return (
        <View style={[es.star, { backgroundColor: ink }]}>
          <View style={[es.starInner, { backgroundColor: ink }]} />
        </View>
      );
    case "heart":
      return (
        <View style={es.heartWrap}>
          <View
            style={[es.heartLobe, { backgroundColor: ink, left: 1 }]}
          />
          <View
            style={[es.heartLobe, { backgroundColor: ink, right: 1 }]}
          />
          <View style={[es.heartPoint, { backgroundColor: ink }]} />
        </View>
      );
  }
}

type MouthVariant =
  | "smile"
  | "tinySmile"
  | "flat"
  | "openSmall"
  | "openBig"
  | "openO"
  | "flatTilt"
  | "sideSmile"
  | "cat";

const MOUTH_MAP: Record<ExpressionName, MouthVariant> = {
  idle: "smile",
  blink: "smile",
  sleepy: "tinySmile",
  wink: "smile",
  happy: "smile",
  grin: "openSmall",
  brace: "flat",
  panic: "openBig",
  lean: "sideSmile",
  send: "openSmall",
  bump: "flat",
  alert: "openSmall",
  love: "openSmall",
  suspicious: "flat",
  yawn: "openBig",
  dizzy: "flatTilt",
  smug: "sideSmile",
  shocked: "openO",
  giggle: "openSmall",
  bored: "flat",
  curious: "openO",
  starstruck: "openSmall",
  nervous: "flatTilt",
  proud: "cat",
};

function Mouth({ variant, ink }: { variant: MouthVariant; ink: string }) {
  switch (variant) {
    case "smile":
      return <View style={[ms.smile, { borderColor: ink }]} />;
    case "tinySmile":
      return <View style={[ms.tinySmile, { borderColor: ink }]} />;
    case "flat":
      return <View style={[ms.flat, { backgroundColor: ink }]} />;
    case "openSmall":
      return <View style={[ms.openSmall, { backgroundColor: ink }]} />;
    case "openBig":
      return <View style={[ms.openBig, { backgroundColor: ink }]} />;
    case "openO":
      return <View style={[ms.openO, { backgroundColor: ink }]} />;
    case "flatTilt":
      return (
        <View
          style={[
            ms.flat,
            { backgroundColor: ink, transform: [{ rotate: "7deg" }] },
          ]}
        />
      );
    case "sideSmile":
      return (
        <View
          style={[
            ms.smile,
            { borderColor: ink, transform: [{ translateX: 5 }] },
          ]}
        />
      );
    case "cat":
      return (
        <View style={ms.catRow}>
          <View style={[ms.catArc, { borderColor: ink }]} />
          <View style={[ms.catArc, { borderColor: ink }]} />
        </View>
      );
  }
}

// ---- styles ------------------------------------------------------------------

const BODY = 144;

const s = StyleSheet.create({
  stage: {
    height: 192,
    alignItems: "center",
    justifyContent: "center",
  },
  bodyWrap: {
    width: BODY,
    height: BODY + 12,
  },
  shadowBlob: {
    position: "absolute",
    top: 12,
    left: 0,
    width: BODY,
    height: BODY,
    borderRadius: 60,
  },
  cheek: {
    position: "absolute",
    top: 74,
    width: 40,
    height: 40,
    borderRadius: 14,
  },
  cheekL: { left: -20, transform: [{ rotate: "-12deg" }] },
  cheekR: { right: -20, transform: [{ rotate: "12deg" }] },
  cheekShadow: {
    position: "absolute",
    top: 78,
    width: 40,
    height: 40,
    borderRadius: 14,
  },
  cheekShadowL: { left: -20, transform: [{ rotate: "-12deg" }] },
  cheekShadowR: { right: -20, transform: [{ rotate: "12deg" }] },
  body: {
    position: "absolute",
    top: 0,
    left: 0,
    width: BODY,
    height: BODY,
    borderRadius: 60,
    alignItems: "center",
  },
  sparkle: {
    position: "absolute",
    top: 4,
    right: 14,
    fontSize: 17,
    color: color.chart2,
  },
  eyesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: 76,
    height: 26,
    marginTop: 42,
  },
  mouthWrap: {
    marginTop: 10,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  blush: {
    position: "absolute",
    bottom: 26,
    width: 14,
    height: 9,
    borderRadius: 5,
    backgroundColor: color.accent,
    opacity: 0.9,
  },
  blushL: { left: 20 },
  blushR: { right: 20 },
  ground: {
    position: "absolute",
    bottom: 10,
    width: 118,
    height: 13,
    borderRadius: 7,
    backgroundColor: "rgba(51, 43, 43, 0.08)",
  },
});

const es = StyleSheet.create({
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  glint: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#FFFFFF",
    marginTop: 2,
    marginRight: 2,
  },
  bar: {
    width: 18,
    height: 5,
    borderRadius: 2.5,
  },
  arc: {
    width: 20,
    height: 12,
    borderTopWidth: 5,
    borderRadius: 10,
  },
  arcDown: {
    width: 20,
    height: 12,
    borderBottomWidth: 5,
    borderRadius: 10,
  },
  wide: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    backgroundColor: "#FFFFFF",
  },
  half: {
    width: 16,
    height: 6,
    borderRadius: 3,
  },
  xWrap: {
    width: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  xBar: {
    width: 16,
    height: 4,
    borderRadius: 2,
  },
  star: {
    width: 15,
    height: 15,
    transform: [{ rotate: "45deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  starInner: {
    width: 7,
    height: 7,
  },
  heartWrap: {
    width: 20,
    height: 18,
  },
  heartLobe: {
    position: "absolute",
    top: 0,
    width: 11,
    height: 11,
    borderRadius: 5.5,
  },
  heartPoint: {
    position: "absolute",
    bottom: 1,
    left: 4.5,
    width: 11,
    height: 11,
    borderRadius: 2,
    transform: [{ rotate: "45deg" }],
  },
});

const ms = StyleSheet.create({
  smile: {
    width: 24,
    height: 12,
    borderBottomWidth: 4,
    borderRadius: 12,
  },
  tinySmile: {
    width: 14,
    height: 7,
    borderBottomWidth: 3.5,
    borderRadius: 7,
  },
  flat: {
    width: 20,
    height: 4,
    borderRadius: 2,
  },
  openSmall: {
    width: 16,
    height: 20,
    borderRadius: 8,
  },
  openBig: {
    width: 22,
    height: 28,
    borderRadius: 11,
  },
  openO: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  catRow: {
    flexDirection: "row",
    gap: 2,
  },
  catArc: {
    width: 11,
    height: 8,
    borderBottomWidth: 3.5,
    borderRadius: 6,
  },
});
