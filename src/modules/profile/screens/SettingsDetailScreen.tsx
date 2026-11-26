import React from "react";
import { StyleSheet, Switch, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { SimpleHeader } from "@/components/common/SimpleHeader";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useTranslation } from "@/i18n";
import { dialog } from "@/shared/dialog/DialogContext";
import { toast } from "@/shared/toast/ToastContext";
import { useCompanionStore } from "@/store/useCompanionStore";
import { ThemePreference, useTheme, useThemeControls } from "@/theme/tokens";

const TITLES: Record<string, string> = {
  goals: "User Goals",
  notifications: "Notifications & Alarms",
  prayer: "Prayer Settings",
  sleep: "Sleep Schedule",
  appearance: "Appearance & Language",
  privacy: "Privacy & Data",
};

export const SettingsDetailScreen: React.FC = () => {
  const { section } = useLocalSearchParams<{ section: string }>();
  const theme = useTheme();
  const { preference, setPreference } = useThemeControls();
  const { language, setLanguage } = useTranslation();

  const prayerAutoMute = useCompanionStore((s) => s.prayerAutoMute);
  const setPrayerAutoMute = useCompanionStore((s) => s.setPrayerAutoMute);
  const sleepSchedule = useCompanionStore((s) => s.sleepSchedule);
  const selectedGoals = useCompanionStore((s) => s.selectedGoals);
  const resetOnboarding = useCompanionStore((s) => s.resetOnboarding);

  const key = section ?? "appearance";

  return (
    <ScreenWrapper includeTabBarClearance={false}>
      <SimpleHeader title={TITLES[key] ?? "Settings"} />

      {key === "appearance" ? (
        <GlassCard elevated padding={18} style={styles.card}>
          <ThemedText variant="h2">Theme</ThemedText>
          <SegmentedControl<ThemePreference>
            value={preference}
            onChange={(val) => setPreference(val)}
            options={[
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
              { value: "system", label: "System" },
            ]}
          />

          <ThemedText variant="h2" style={{ marginTop: 8 }}>
            Language
          </ThemedText>
          <SegmentedControl<"en" | "ar">
            value={language}
            onChange={(val) => setLanguage(val)}
            options={[
              { value: "en", label: "English" },
              { value: "ar", label: "العربية" },
            ]}
          />
        </GlassCard>
      ) : null}

      {key === "goals" ? (
        <GlassCard elevated padding={18} style={styles.card}>
          <ThemedText variant="cardTitle">Active Focus Goals</ThemedText>
          {selectedGoals.length === 0 ? (
            <ThemedText variant="body" color="secondary">
              No specific goals pinned yet.
            </ThemedText>
          ) : (
            selectedGoals.map((goal) => (
              <ThemedText key={goal} variant="body" color="secondary">
                • {goal}
              </ThemedText>
            ))
          )}
        </GlassCard>
      ) : null}

      {key === "prayer" ? (
        <GlassCard elevated padding={18} style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText variant="cardTitle">Prayer Focus Auto-Mute</ThemedText>
              <ThemedText variant="caption" color="secondary">
                Quiet media during prayer focus window (uses Focus Filter on iOS, DND permission on Android).
              </ThemedText>
            </View>
            <Switch
              value={prayerAutoMute}
              onValueChange={(val) => setPrayerAutoMute(val)}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>
        </GlassCard>
      ) : null}

      {key === "sleep" ? (
        <GlassCard elevated padding={18} style={styles.card}>
          <ThemedText variant="cardTitle">Current Sleep Window</ThemedText>
          <ThemedText variant="display" color="primary">
            {sleepSchedule.bedtime} → {sleepSchedule.wakeTime}
          </ThemedText>
          <ThemedText variant="caption" color="secondary">
            Used to calibrate wind-down reminders and Fajr readiness tips.
          </ThemedText>
        </GlassCard>
      ) : null}

      {key === "privacy" ? (
        <GlassCard elevated padding={18} style={styles.card}>
          <ThemedText variant="cardTitle">Local-First Privacy</ThemedText>
          <ThemedText variant="body" color="secondary">
            All tasks, habits, and preferences are stored locally in SQLite with zero external backend dependency.
          </ThemedText>
          <Button
            title="Replay Onboarding"
            variant="outline"
            onPress={async () => {
              const ok = await dialog.confirm({
                title: "Replay Onboarding?",
                message: "Your saved tasks and habits remain intact.",
              });
              if (ok) {
                await resetOnboarding();
                toast.info("Onboarding reset");
                router.replace("/onboarding");
              }
            }}
          />
        </GlassCard>
      ) : null}

      {key === "notifications" ? (
        <GlassCard elevated padding={18} style={styles.card}>
          <ThemedText variant="cardTitle">Notifications & Alarms</ThemedText>
          <ThemedText variant="body" color="secondary">
            OS notification channels, quiet hours, and rolling prayer reminders will activate in Phase 3.
          </ThemedText>
        </GlassCard>
      ) : null}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});
