import React, { useState } from "react";
import { StyleSheet, Switch, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { SimpleHeader } from "@/components/common/SimpleHeader";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { getSupabaseClient } from "@/core/supabase/client";
import { useTranslation } from "@/i18n";
import { useAuthStore } from "@/modules/auth/store/useAuthStore";
import { notificationService } from "@/modules/notifications/services/notificationService";
import { dialog } from "@/shared/dialog/DialogContext";
import { toast } from "@/shared/toast/ToastContext";
import { useCompanionStore } from "@/store/useCompanionStore";
import { ThemePreference, useTheme, useThemeControls } from "@/theme/tokens";
import type { Database } from "@/types/supabase";

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
  const authUser = useAuthStore((s) => s.user);

  const prayerAutoMute = useCompanionStore((s) => s.prayerAutoMute);
  const setPrayerAutoMute = useCompanionStore((s) => s.setPrayerAutoMute);
  const sleepSchedule = useCompanionStore((s) => s.sleepSchedule);
  const selectedGoals = useCompanionStore((s) => s.selectedGoals);
  const resetOnboarding = useCompanionStore((s) => s.resetOnboarding);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [hideSensitivePreview, setHideSensitivePreview] = useState(true);
  const [quietHoursEnabled, setQuietHoursEnabled] = useState(true);
  const [dailyCap, setDailyCap] = useState<"3" | "6" | "10">("6");
  const [isEvaluating, setIsEvaluating] = useState(false);

  const key = section ?? "appearance";

  const syncNotificationPrefs = async (
    patch: Database["public"]["Tables"]["user_preferences"]["Update"],
  ) => {
    const supabase = getSupabaseClient();
    if (!supabase || !authUser) return;
    await supabase
      .from("user_preferences")
      .update(patch)
      .eq("user_id", authUser.id);
  };

  const handleEvaluateSmartNotifications = async () => {
    const supabase = getSupabaseClient();
    if (!supabase || !authUser) {
      toast.info("Sign in to Cloud Backup & Sync to run cloud notification rules.");
      return;
    }
    setIsEvaluating(true);
    try {
      const { data, error } = await supabase.functions.invoke("smart-notifications-cron");
      if (error) throw new Error(error.message);
      const sent = data?.result?.sent ?? 0;
      toast.success(`Smart check complete (${sent} notification${sent === 1 ? "" : "s"} queued).`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Evaluation failed");
    } finally {
      setIsEvaluating(false);
    }
  };

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
          <ThemedText variant="cardTitle">Local-First Privacy & AI Controls</ThemedText>
          <ThemedText variant="body" color="secondary">
            Tasks, habits, and routines live locally in SQLite. When signed in, only summarized recent metrics are shared with the OpenAI coach upon request.
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
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText variant="cardTitle">Gentle Notifications</ThemedText>
              <ThemedText variant="caption" color="secondary">
                Enable scheduled local & cloud smart reminders
              </ThemedText>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={(val) => {
                setNotificationsEnabled(val);
                syncNotificationPrefs({ notifications_enabled: val });
              }}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText variant="cardTitle">Hide Sensitive Previews</ThemedText>
              <ThemedText variant="caption" color="secondary">
                Mask private habit details on lock-screen alerts
              </ThemedText>
            </View>
            <Switch
              value={hideSensitivePreview}
              onValueChange={(val) => {
                setHideSensitivePreview(val);
                syncNotificationPrefs({ privacy_hide_preview: val });
              }}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText variant="cardTitle">Quiet Hours (22:30 – 05:30)</ThemedText>
              <ThemedText variant="caption" color="secondary">
                Pause non-urgent reminders while resting
              </ThemedText>
            </View>
            <Switch
              value={quietHoursEnabled}
              onValueChange={(val) => {
                setQuietHoursEnabled(val);
                syncNotificationPrefs({
                  quiet_hours_start: val ? "22:30" : null,
                  quiet_hours_end: val ? "05:30" : null,
                });
              }}
              trackColor={{ false: theme.border, true: theme.primary }}
            />
          </View>

          <ThemedText variant="caption" color="secondary" weight="semiBold">
            Daily Notification Cap
          </ThemedText>
          <SegmentedControl<"3" | "6" | "10">
            value={dailyCap}
            onChange={(val) => {
              setDailyCap(val);
              syncNotificationPrefs({ max_notifications_per_day: Number(val) });
            }}
            options={[
              { value: "3", label: "Max 3/day" },
              { value: "6", label: "Max 6/day" },
              { value: "10", label: "Max 10/day" },
            ]}
          />

          <Button
            title="Send Test Local Reminder"
            variant="outline"
            fullWidth
            onPress={async () => {
              const ok = await notificationService.sendTestNotification();
              if (ok) toast.success("Test notification scheduled in 2 seconds");
              else toast.info("Local notifications run on iOS & Android devices.");
            }}
          />

          <Button
            title="Run Smart Check-In Rules"
            variant="gradient"
            fullWidth
            loading={isEvaluating}
            onPress={handleEvaluateSmartNotifications}
          />
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
