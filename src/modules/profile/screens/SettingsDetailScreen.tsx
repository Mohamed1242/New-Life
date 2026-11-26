import React, { useState } from "react";
import { Pressable, StyleSheet, Switch, View } from "react-native";
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
import {
  usePrayerSettings,
  useUpdatePrayerSettings,
} from "@/modules/prayer/hooks/usePrayer";
import { audioFocusService } from "@/modules/prayer/services/audioFocusService";
import {
  CITY_PRESETS,
  locationService,
} from "@/modules/prayer/services/locationService";
import {
  CALCULATION_METHOD_META,
  PRAYER_LABELS,
  PRAYER_ORDER,
  type AsrSchool,
  type PrayerCalculationMethodKey,
} from "@/modules/prayer/types/prayer.types";
import { dialog } from "@/shared/dialog/DialogContext";
import { errorMonitor, type RecordedErrorEvent } from "@/shared/monitoring/errorMonitor";
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
  const [isDetectingGps, setIsDetectingGps] = useState(false);
  const [diagnostics, setDiagnostics] = useState<RecordedErrorEvent[]>([]);

  const { data: prayerSettings } = usePrayerSettings();
  const updatePrayerMutation = useUpdatePrayerSettings();
  const audioCaps = audioFocusService.getCapabilities();

  const key = section ?? "appearance";

  React.useEffect(() => {
    if (key === "privacy") {
      errorMonitor.listRecent().then(setDiagnostics).catch(() => {});
    }
  }, [key]);

  const handleDetectGps = async () => {
    setIsDetectingGps(true);
    try {
      const detected = await locationService.detectCurrentLocation();
      await updatePrayerMutation.mutateAsync({
        locationMode: "gps",
        cityName: detected.cityName,
        latitude: detected.latitude,
        longitude: detected.longitude,
        timezone: detected.timezone,
      });
      toast.success(`Location set to ${detected.cityName}`);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not detect GPS location",
      );
    } finally {
      setIsDetectingGps(false);
    }
  };

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

      {key === "prayer" && prayerSettings ? (
        <View style={{ gap: 14 }}>
          <GlassCard elevated padding={18} style={styles.card}>
            <ThemedText variant="cardTitle">Location & Timezone</ThemedText>
            <ThemedText variant="body" color="secondary">
              {prayerSettings.cityName} ({prayerSettings.latitude.toFixed(2)},{" "}
              {prayerSettings.longitude.toFixed(2)}) · {prayerSettings.timezone}
            </ThemedText>
            <Button
              title="Use Current GPS Location"
              variant="gradient"
              loading={isDetectingGps}
              onPress={handleDetectGps}
            />
            <ThemedText variant="caption" color="secondary" weight="semiBold">
              Or Pick City Manually (Offline)
            </ThemedText>
            <View style={styles.chipGrid}>
              {CITY_PRESETS.map((city) => {
                const active = prayerSettings.cityName.startsWith(city.name);
                return (
                  <Pressable
                    key={city.id}
                    onPress={async () => {
                      await updatePrayerMutation.mutateAsync({
                        locationMode: "manual",
                        cityName: `${city.name}, ${city.country}`,
                        latitude: city.latitude,
                        longitude: city.longitude,
                        timezone: city.timezone,
                        calculationMethod: city.recommendedMethod,
                      });
                      toast.success(`Prayer times updated for ${city.name}`);
                    }}
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? theme.primary : theme.border,
                        backgroundColor: active
                          ? theme.primaryMuted
                          : theme.surface,
                      },
                    ]}
                  >
                    <ThemedText
                      variant="caption"
                      weight={active ? "semiBold" : "regular"}
                      style={{
                        color: active ? theme.primary : theme.textSecondary,
                      }}
                    >
                      {city.name}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </GlassCard>

          <GlassCard elevated padding={18} style={styles.card}>
            <ThemedText variant="cardTitle">Calculation Method</ThemedText>
            <View style={styles.chipGrid}>
              {(
                Object.keys(
                  CALCULATION_METHOD_META,
                ) as PrayerCalculationMethodKey[]
              ).map((methodKey) => {
                const active = prayerSettings.calculationMethod === methodKey;
                return (
                  <Pressable
                    key={methodKey}
                    onPress={() =>
                      updatePrayerMutation.mutate({
                        calculationMethod: methodKey,
                      })
                    }
                    style={[
                      styles.chip,
                      {
                        borderColor: active ? theme.primary : theme.border,
                        backgroundColor: active
                          ? theme.primaryMuted
                          : theme.surface,
                      },
                    ]}
                  >
                    <ThemedText
                      variant="caption"
                      weight={active ? "semiBold" : "regular"}
                      style={{
                        color: active ? theme.primary : theme.textSecondary,
                      }}
                    >
                      {CALCULATION_METHOD_META[methodKey].shortLabel}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <ThemedText variant="caption" color="secondary">
              {
                CALCULATION_METHOD_META[prayerSettings.calculationMethod]
                  .description
              }
            </ThemedText>

            <ThemedText variant="caption" color="secondary" weight="semiBold">
              Asr Juristic School
            </ThemedText>
            <SegmentedControl<AsrSchool>
              value={prayerSettings.asrSchool}
              onChange={(val) =>
                updatePrayerMutation.mutate({ asrSchool: val })
              }
              options={[
                { value: "shafi", label: "Standard (Shafi)" },
                { value: "hanafi", label: "Hanafi" },
              ]}
            />
          </GlassCard>

          <GlassCard elevated padding={18} style={styles.card}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="cardTitle">Prayer Notifications</ThemedText>
                <ThemedText variant="caption" color="secondary">
                  Schedules rolling Adhan alerts locally for 3 days
                </ThemedText>
              </View>
              <Switch
                value={prayerSettings.notificationsEnabled}
                onValueChange={(val) =>
                  updatePrayerMutation.mutate({ notificationsEnabled: val })
                }
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>

            <ThemedText variant="caption" color="secondary" weight="semiBold">
              Advance Reminder Timing
            </ThemedText>
            <SegmentedControl<"0" | "5" | "10" | "15">
              value={
                (["0", "5", "10", "15"].includes(
                  String(prayerSettings.advanceMinutes),
                )
                  ? String(prayerSettings.advanceMinutes)
                  : "10") as "0" | "5" | "10" | "15"
              }
              onChange={(val) =>
                updatePrayerMutation.mutate({ advanceMinutes: Number(val) })
              }
              options={[
                { value: "0", label: "Adhan Only" },
                { value: "5", label: "-5 min" },
                { value: "10", label: "-10 min" },
                { value: "15", label: "-15 min" },
              ]}
            />

            <View style={styles.chipGrid}>
              {PRAYER_ORDER.map((pKey) => {
                const enabled = prayerSettings.perPrayerEnabled[pKey];
                return (
                  <Pressable
                    key={pKey}
                    onPress={() =>
                      updatePrayerMutation.mutate({
                        perPrayerEnabled: {
                          ...prayerSettings.perPrayerEnabled,
                          [pKey]: !enabled,
                        },
                      })
                    }
                    style={[
                      styles.chip,
                      {
                        borderColor: enabled ? theme.primary : theme.border,
                        backgroundColor: enabled
                          ? theme.primaryMuted
                          : theme.surface,
                      },
                    ]}
                  >
                    <ThemedText
                      variant="caption"
                      style={{
                        color: enabled ? theme.primary : theme.textMuted,
                      }}
                    >
                      {PRAYER_LABELS[pKey].en}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <ThemedText variant="cardTitle">
                  Prayer Focus Audio Ducking
                </ThemedText>
                <ThemedText variant="caption" color="secondary">
                  {audioCaps.description}
                </ThemedText>
              </View>
              <Switch
                value={prayerAutoMute && prayerSettings.audioFocusEnabled}
                onValueChange={(val) => {
                  setPrayerAutoMute(val);
                  updatePrayerMutation.mutate({ audioFocusEnabled: val });
                }}
                trackColor={{ false: theme.border, true: theme.primary }}
              />
            </View>

            <Button
              title="Open Prayer Schedule"
              variant="outline"
              onPress={() => router.push("/(modals)/prayers")}
            />
          </GlassCard>
        </View>
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
        <View style={{ gap: 14 }}>
          <GlassCard elevated padding={18} style={styles.card}>
            <ThemedText variant="cardTitle">Local-First Privacy & AI Controls</ThemedText>
            <ThemedText variant="body" color="secondary">
              Tasks, habits, prayer logs, alarms, and reflections live locally in SQLite. When signed in, cloud records use Supabase RLS (`auth.uid() = user_id`). AI reviews send only compact summarized context on demand—no API keys are stored on the device.
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              Permissions used: Notifications (alerts & alarms) and optional When-In-Use Location (offline prayer calculations only).
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

          <GlassCard padding={18} style={styles.card}>
            <ThemedText variant="cardTitle">Crash & API Diagnostics</ThemedText>
            <ThemedText variant="caption" color="secondary">
              {diagnostics.length === 0
                ? "No recent crash or API failures recorded on this device."
                : `${diagnostics.length} diagnostic event${diagnostics.length === 1 ? "" : "s"} recorded (tokens & emails redacted).`}
            </ThemedText>
            {diagnostics.slice(0, 3).map((evt) => (
              <ThemedText key={evt.id} variant="micro" color="muted" numberOfLines={2}>
                [{evt.domain}] {evt.message}
              </ThemedText>
            ))}
            {diagnostics.length > 0 ? (
              <Button
                title="Clear Diagnostic Log"
                variant="outline"
                size="sm"
                onPress={async () => {
                  await errorMonitor.clear();
                  setDiagnostics([]);
                  toast.info("Diagnostics cleared");
                }}
              />
            ) : null}
          </GlassCard>
        </View>
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
  chipGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
});
