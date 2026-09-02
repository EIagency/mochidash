import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { IconCamera, IconClose, IconGauge, IconSpeaker, IconSpeakerX } from "@/components/icons";
import { useSettings } from "@/lib/settings";
import { COLOURWAY_ORDER, COLOURWAYS, color, font, radius } from "@/lib/theme";

export default function SettingsModal() {
  const router = useRouter();
  const { settings, update, requestRelevel } = useSettings();

  const select = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
  };

  return (
    <View style={s.root}>
      <SafeAreaView edges={["top"]} style={s.flex}>
        <View style={s.header}>
          <Text style={s.title}>Settings</Text>
          <Pressable
            onPress={() => router.back()}
            style={s.roundButton}
            accessibilityLabel="Close settings"
          >
            <IconClose size={20} color={color.foreground} />
          </Pressable>
        </View>

        <ScrollView
          style={s.flex}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Colourway */}
          <Text style={s.sectionLabel}>COLOURWAY</Text>
          <View style={s.card}>
            <View style={s.swatches}>
              {COLOURWAY_ORDER.map((key) => {
                const cw = COLOURWAYS[key];
                const active = settings.colourway === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      select();
                      update({ colourway: key });
                    }}
                    style={s.swatchWrap}
                    accessibilityLabel={cw.label}
                  >
                    <View
                      style={[
                        s.swatch,
                        { backgroundColor: cw.body },
                        active && s.swatchActive,
                      ]}
                    >
                      <View
                        style={[
                          s.swatchShadow,
                          { backgroundColor: cw.shadowColor },
                        ]}
                      />
                    </View>
                    <Text
                      style={[s.swatchLabel, active && s.swatchLabelActive]}
                    >
                      {cw.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Sound */}
          <Text style={s.sectionLabel}>SOUND</Text>
          <View style={s.card}>
            <SettingRow
              icon={
                settings.muted ? (
                  <IconSpeakerX size={20} color={color.mutedForeground} />
                ) : (
                  <IconSpeaker size={20} color={color.mutedForeground} />
                )
              }
              label="Mute mochi"
              value={settings.muted}
              onValueChange={(v) => update({ muted: v })}
            />
            <View style={s.divider} />
            <SettingRow
              icon={<IconSpeaker size={20} color={color.mutedForeground} />}
              label="Play in silent mode"
              sub="Override the iOS silent switch"
              value={settings.playInSilentMode}
              onValueChange={(v) => update({ playInSilentMode: v })}
            />
          </View>

          {/* Cameras */}
          <Text style={s.sectionLabel}>CAMERAS</Text>
          <View style={s.card}>
            <SettingRow
              icon={<IconCamera size={20} color={color.mutedForeground} />}
              label="Speed camera warnings"
              sub="Automatically off in FR, DE and CH"
              value={settings.cameraWarnings}
              onValueChange={(v) => update({ cameraWarnings: v })}
            />
          </View>

          {/* Motion */}
          <Text style={s.sectionLabel}>MOTION</Text>
          <View style={s.card}>
            <SettingRow
              icon={<IconGauge size={20} color={color.mutedForeground} />}
              label="Flip steering axis"
              value={settings.flipLateral}
              onValueChange={(v) => update({ flipLateral: v })}
            />
            <View style={s.divider} />
            <SettingRow
              icon={<IconGauge size={20} color={color.mutedForeground} />}
              label="Flip throttle axis"
              value={settings.flipLongitudinal}
              onValueChange={(v) => update({ flipLongitudinal: v })}
            />
            <View style={s.divider} />
            <Pressable
              style={s.relevelButton}
              onPress={() => {
                select();
                requestRelevel();
                router.back();
              }}
            >
              <Text style={s.relevelText}>Re-level sensor</Text>
              <Text style={s.relevelSub}>
                Mount the phone, hold still, tap this
              </Text>
            </Pressable>
          </View>

          {/* Debug */}
          <Text style={s.sectionLabel}>DEBUG</Text>
          <View style={s.card}>
            <SettingRow
              icon={<IconGauge size={20} color={color.mutedForeground} />}
              label="Debug HUD"
              sub="Live lateral, longitudinal and vertical g"
              value={settings.debugHud}
              onValueChange={(v) => update({ debugHud: v })}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function SettingRow({
  icon,
  label,
  sub,
  value,
  onValueChange,
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  return (
    <View style={s.row}>
      <View style={s.rowIcon}>{icon}</View>
      <View style={s.flex}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontFamily: font.heading,
    fontSize: 26,
    color: color.foreground,
  },
  roundButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: color.card,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { padding: 20, gap: 10, paddingBottom: 48 },
  sectionLabel: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    letterSpacing: 2,
    color: color.mutedForeground,
    marginTop: 14,
    marginBottom: 2,
    marginLeft: 4,
  },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: color.border,
    padding: 6,
  },
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    padding: 10,
  },
  swatchWrap: { alignItems: "center", gap: 6, width: 60 },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "flex-end",
    borderWidth: 2,
    borderColor: "transparent",
  },
  swatchActive: {
    borderColor: color.foreground,
  },
  swatchShadow: {
    width: 26,
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  swatchLabel: {
    fontFamily: font.bodyMedium,
    fontSize: 11,
    color: color.mutedForeground,
    textAlign: "center",
  },
  swatchLabelActive: {
    color: color.foreground,
    fontFamily: font.bodyBold,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: color.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontFamily: font.bodyBold,
    fontSize: 15,
    color: color.foreground,
  },
  rowSub: {
    fontFamily: font.body,
    fontSize: 12,
    color: color.mutedForeground,
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: color.border,
    marginHorizontal: 12,
  },
  relevelButton: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  relevelText: {
    fontFamily: font.bodyBold,
    fontSize: 15,
    color: color.primary,
  },
  relevelSub: {
    fontFamily: font.body,
    fontSize: 12,
    color: color.mutedForeground,
    marginTop: 2,
  },
});
