import { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import * as Battery from "expo-battery";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import { useRouter } from "expo-router";
import MochiFace, { GReading } from "@/components/MochiFace";
import {
  IconBattery,
  IconCamera,
  IconClock,
  IconGauge,
  IconGear,
  IconNav,
  IconPause,
  IconPlay,
} from "@/components/icons";
import { useSettings } from "@/lib/settings";
import {
  EXPRESSIONS,
  EXPRESSION_ORDER,
  EXPRESSION_TOTAL,
  ExpressionName,
  STATUS_FLAVOR,
} from "@/lib/expressions";
import { color, font, radius, shadow } from "@/lib/theme";
import { useSpeedCameras } from "@/hooks/useSpeedCameras";

export default function HomeScreen() {
  useKeepAwake();
  const router = useRouter();
  const { settings, requestRelevel } = useSettings();

  const [paused, setPaused] = useState(false);
  const [expr, setExpr] = useState<ExpressionName>("idle");
  const [g, setG] = useState<GReading>({ x: 0, y: 0, z: 0 });
  const [now, setNow] = useState(() => new Date());
  const [battery, setBattery] = useState<number | null>(null);

  const { warning, speedMph } = useSpeedCameras(settings.cameraWarnings);

  // Clock tick -- also drives the night-dim check.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 20000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (Platform.OS === "web") return;
    let mounted = true;
    const read = async () => {
      try {
        const level = await Battery.getBatteryLevelAsync();
        if (mounted && level >= 0) setBattery(level);
      } catch {
        // battery unavailable
      }
    };
    read();
    const t = setInterval(read, 30000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const togglePaused = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    setPaused((p) => !p);
  };

  const exprDef = EXPRESSIONS[expr];
  const exprIndex = EXPRESSION_ORDER.indexOf(expr) + 1;
  const statusText = paused
    ? "Mochi is having a nap"
    : warning
      ? `Speed camera in ${Math.round(warning.distanceM)} m`
      : `Mochi is feeling ${STATUS_FLAVOR[expr]}`;

  const showSpeed = speedMph > 4;
  const hour = now.getHours();
  const isNight = hour >= 19 || hour < 7;
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const dateStr = now.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={s.flex}>
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={s.header}>
            <View style={s.flex}>
              <Text style={s.eyebrow}>MOCHI COMPANION</Text>
              <Text style={s.hello}>Hi, driver ✦</Text>
            </View>
            <Pressable
              onPress={() => router.push("/settings")}
              style={s.roundButton}
              accessibilityLabel="Settings"
            >
              <IconGear size={22} color={color.foreground} />
            </Pressable>
          </View>

          {/* Stage card */}
          <View style={s.stageCard}>
            <View style={s.peachCircle} />
            <View style={s.stageTopRow}>
              <View style={s.liveRow}>
                {paused ? (
                  <View style={[s.liveDot, { backgroundColor: color.mutedForeground }]} />
                ) : (
                  <PulsingDot />
                )}
                <Text style={s.liveText}>{paused ? "Paused" : "Mochi is live"}</Text>
              </View>
              <Pressable
                onPress={togglePaused}
                style={s.roundButton}
                accessibilityLabel={paused ? "Resume" : "Pause"}
              >
                {paused ? (
                  <IconPlay size={18} color={color.foreground} />
                ) : (
                  <IconPause size={18} color={color.foreground} />
                )}
              </Pressable>
            </View>

            <Text style={s.statusText}>{statusText}</Text>

            <Pressable
              onLongPress={() => {
                if (Platform.OS !== "web") {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
                    () => {},
                  );
                }
                requestRelevel();
              }}
              delayLongPress={450}
            >
              <MochiFace
                paused={paused}
                cameraWarning={warning}
                onExpression={setExpr}
                onG={settings.debugHud ? setG : undefined}
              />
            </Pressable>

            <View style={s.chipRow}>
              <View style={s.chip}>
                <Text style={s.chipText}>
                  {exprDef.label} · {exprIndex} of {EXPRESSION_TOTAL}
                </Text>
              </View>
            </View>

            {settings.debugHud && (
              <View style={s.hud}>
                <HudRow label="LAT" value={g.x} barColor={color.primary} />
                <HudRow label="LON" value={g.y} barColor={color.chart2} />
                <HudRow label="VER" value={g.z} barColor={color.destructive} />
              </View>
            )}
          </View>

          {/* Tiles */}
          <View style={s.tilesRow}>
            <View style={[s.tile, s.flex]}>
              <View style={s.tileIconRow}>
                <IconBattery size={22} color={color.mutedForeground} />
                <Text style={s.tileLabel}>Battery</Text>
              </View>
              <Text style={s.tileValue}>
                {battery == null ? "—" : `${Math.round(battery * 100)}%`}
              </Text>
              <View style={s.batteryTrack}>
                <View
                  style={[
                    s.batteryFill,
                    { width: `${Math.round((battery ?? 0) * 100)}%` },
                  ]}
                />
              </View>
            </View>
            <View style={[s.tile, s.flex]}>
              <View style={s.tileIconRow}>
                {showSpeed ? (
                  <IconGauge size={22} color={color.mutedForeground} />
                ) : (
                  <IconClock size={22} color={color.mutedForeground} />
                )}
                <Text style={s.tileLabel}>{showSpeed ? "Speed" : "Clock"}</Text>
              </View>
              <Text style={s.tileValue}>
                {showSpeed ? `${Math.round(speedMph)}` : `${hh}:${mm}`}
              </Text>
              <Text style={s.tileSub}>
                {showSpeed ? "mph · GPS" : dateStr}
              </Text>
            </View>
          </View>

          {/* Alert card: camera warning takes it over */}
          {warning ? (
            <View style={[s.alertCard, warning.over && s.alertCardOver]}>
              <View
                style={[
                  s.alertIconWrap,
                  warning.over && s.alertIconWrapOver,
                ]}
              >
                <IconCamera
                  size={26}
                  color={warning.over ? "#FFFFFF" : color.destructive}
                />
              </View>
              <View style={s.flex}>
                <Text style={s.alertTitle}>Speed camera</Text>
                <Text style={s.alertSub}>
                  {Math.round(warning.distanceM)} m ahead
                  {warning.camera.maxspeedMph != null
                    ? ` · limit ${warning.camera.maxspeedMph} mph`
                    : ""}
                </Text>
              </View>
              {warning.over && (
                <View style={s.overChip}>
                  <Text style={s.overChipText}>+{warning.overBy}</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={s.alertCard}>
              <View style={[s.alertIconWrap, s.alertIconWrapDefault]}>
                <IconNav size={24} color={color.mutedForeground} />
              </View>
              <View style={s.flex}>
                <Text style={s.alertTitle}>Next turn</Text>
                <Text style={s.alertSub}>Head onto the A3022</Text>
              </View>
              <Text style={s.alertRight}>0.4 mi</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Night dimming: keep the blob out of the windscreen reflection */}
      {isNight && <View pointerEvents="none" style={s.nightDim} />}
    </View>
  );
}

function PulsingDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withRepeat(withTiming(0.25, { duration: 900 }), -1, true);
  }, []);
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[s.liveDot, { backgroundColor: color.primary }, style]} />;
}

function HudRow({
  label,
  value,
  barColor,
}: {
  label: string;
  value: number;
  barColor: string;
}) {
  const pct = Math.min(Math.abs(value) / 0.8, 1) * 50;
  return (
    <View style={s.hudRow}>
      <Text style={s.hudLabel}>{label}</Text>
      <View style={s.hudTrack}>
        <View style={s.hudCenter} />
        <View
          style={[
            s.hudFill,
            {
              backgroundColor: barColor,
              width: `${pct}%`,
              left: value >= 0 ? "50%" : `${50 - pct}%`,
            },
          ]}
        />
      </View>
      <Text style={s.hudValue}>{value.toFixed(2)}g</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  flex: { flex: 1 },
  content: { padding: 20, gap: 16, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  eyebrow: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    letterSpacing: 2.2,
    color: color.mutedForeground,
  },
  hello: {
    fontFamily: font.heading,
    fontSize: 30,
    color: color.foreground,
    marginTop: 2,
  },
  roundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },

  stageCard: {
    backgroundColor: color.secondary,
    borderRadius: radius.stage,
    padding: 18,
    overflow: "hidden",
  },
  peachCircle: {
    position: "absolute",
    top: -44,
    right: -44,
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: color.accent,
  },
  stageTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: {
    fontFamily: font.bodyMedium,
    fontSize: 13,
    color: color.mutedForeground,
  },
  statusText: {
    fontFamily: font.body,
    fontSize: 15,
    color: color.foreground,
    marginTop: 10,
  },
  chipRow: { flexDirection: "row", justifyContent: "center", marginTop: 4 },
  chip: {
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  chipText: {
    fontFamily: font.bodyBold,
    fontSize: 12,
    color: color.mutedForeground,
    letterSpacing: 0.4,
  },

  hud: {
    marginTop: 12,
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: 12,
    gap: 8,
  },
  hudRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  hudLabel: {
    fontFamily: font.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2,
    color: color.mutedForeground,
    width: 30,
  },
  hudTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: color.muted,
    overflow: "hidden",
  },
  hudCenter: {
    position: "absolute",
    left: "50%",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: color.border,
  },
  hudFill: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderRadius: 4,
  },
  hudValue: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    color: color.foreground,
    fontVariant: ["tabular-nums"],
    width: 52,
    textAlign: "right",
  },

  tilesRow: { flexDirection: "row", gap: 12 },
  tile: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    boxShadow: shadow.card,
    padding: 16,
    gap: 6,
  },
  tileIconRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tileLabel: {
    fontFamily: font.bodyMedium,
    fontSize: 12,
    color: color.mutedForeground,
  },
  tileValue: {
    fontFamily: font.heading,
    fontSize: 26,
    color: color.foreground,
    fontVariant: ["tabular-nums"],
  },
  tileSub: {
    fontFamily: font.body,
    fontSize: 12,
    color: color.mutedForeground,
  },
  batteryTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: color.muted,
    overflow: "hidden",
    marginTop: 2,
  },
  batteryFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: color.primary,
  },

  alertCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    boxShadow: shadow.card,
    padding: 14,
  },
  alertCardOver: {
    backgroundColor: color.destructive,
    borderColor: color.destructive,
  },
  alertIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: color.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  alertIconWrapOver: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  alertIconWrapDefault: {
    backgroundColor: color.secondary,
  },
  alertTitle: {
    fontFamily: font.bodyBold,
    fontSize: 15,
    color: color.foreground,
  },
  alertSub: {
    fontFamily: font.body,
    fontSize: 13,
    color: color.mutedForeground,
    marginTop: 1,
  },
  alertRight: {
    fontFamily: font.heading,
    fontSize: 16,
    color: color.foreground,
    fontVariant: ["tabular-nums"],
  },
  overChip: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  overChipText: {
    fontFamily: font.heading,
    fontSize: 14,
    color: color.destructive,
    fontVariant: ["tabular-nums"],
  },

  nightDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(24, 12, 24, 0.45)",
    zIndex: 50,
  },
});
