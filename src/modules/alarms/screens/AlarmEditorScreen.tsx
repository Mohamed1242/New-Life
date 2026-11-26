import React, { useEffect, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Switch,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { SimpleHeader } from "@/components/common/SimpleHeader";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { toast } from "@/shared/toast/ToastContext";
import { useTheme } from "@/theme/tokens";
import { useAlarmById, useUpsertAlarm } from "../hooks/useAlarms";
import { alarmAudioService } from "../services/alarmAudioService";
import {
  ALARM_SOUNDS,
  formatAlarmClock,
  type AlarmItem,
  type AlarmSoundKey,
} from "../types/alarm.types";

const DAY_CHIPS = [
  { day: 0, label: "Su" },
  { day: 1, label: "Mo" },
  { day: 2, label: "Tu" },
  { day: 3, label: "We" },
  { day: 4, label: "Th" },
  { day: 5, label: "Fr" },
  { day: 6, label: "Sa" },
];

const AlarmEditorForm: React.FC<{ existing?: AlarmItem | null }> = ({
  existing,
}) => {
  const theme = useTheme();
  const upsertMutation = useUpsertAlarm();

  const [label, setLabel] = useState(existing?.label ?? "Morning Wake-Up");
  const [hour, setHour] = useState(existing?.hour ?? 5);
  const [minute, setMinute] = useState(existing?.minute ?? 15);
  const [days, setDays] = useState<number[]>(
    existing?.days ?? [0, 1, 2, 3, 4, 5, 6],
  );
  const [soundKey, setSoundKey] = useState<AlarmSoundKey>(
    existing?.soundKey ?? "gentle_dawn",
  );
  const [snoozeMinutes, setSnoozeMinutes] = useState<"5" | "10" | "15">(
    existing?.snoozeMinutes === 15
      ? "15"
      : existing?.snoozeMinutes === 10
        ? "10"
        : "5",
  );
  const [vibrate, setVibrate] = useState(existing?.vibrate ?? true);
  const [isEnabled, setIsEnabled] = useState(existing?.isEnabled ?? true);

  useEffect(() => {
    return () => {
      alarmAudioService.stop();
    };
  }, []);

  const toggleDay = (d: number) => {
    setDays((prev) =>
      prev.includes(d)
        ? prev.filter((item) => item !== d)
        : [...prev, d].sort((a, b) => a - b),
    );
  };

  const stepHour = (delta: number) => {
    setHour((prev) => (prev + delta + 24) % 24);
  };

  const stepMinute = (delta: number) => {
    setMinute((prev) => (prev + delta + 60) % 60);
  };

  const handlePreviewSound = (key: AlarmSoundKey) => {
    setSoundKey(key);
    alarmAudioService.playSound(key, false);
  };

  const handleSave = async () => {
    await upsertMutation.mutateAsync({
      id: existing?.id,
      label: label.trim() || "Wake-Up Alarm",
      hour,
      minute,
      days,
      soundKey,
      snoozeMinutes: Number(snoozeMinutes),
      isEnabled,
      vibrate,
    });
    alarmAudioService.stop();
    toast.success("Alarm scheduled");
    router.back();
  };

  const clock = formatAlarmClock(hour, minute);

  return (
    <ScreenWrapper includeTabBarClearance={false}>
      <SimpleHeader title={existing ? "Edit Alarm" : "New Alarm"} />

      <GlassCard elevated padding={18} style={styles.card}>
        <ThemedText variant="caption" color="secondary" center>
          Alarm Time
        </ThemedText>
        <View style={styles.timePickerRow}>
          <View style={styles.stepperCol}>
            <Pressable
              onPress={() => stepHour(1)}
              style={[styles.stepBtn, { backgroundColor: theme.surface }]}
            >
              <ThemedText variant="h2">+</ThemedText>
            </Pressable>
            <ThemedText variant="display" color="primary">
              {clock.time.split(":")[0]}
            </ThemedText>
            <Pressable
              onPress={() => stepHour(-1)}
              style={[styles.stepBtn, { backgroundColor: theme.surface }]}
            >
              <ThemedText variant="h2">−</ThemedText>
            </Pressable>
          </View>

          <ThemedText variant="display">:</ThemedText>

          <View style={styles.stepperCol}>
            <Pressable
              onPress={() => stepMinute(5)}
              style={[styles.stepBtn, { backgroundColor: theme.surface }]}
            >
              <ThemedText variant="h2">+</ThemedText>
            </Pressable>
            <ThemedText variant="display" color="primary">
              {clock.time.split(":")[1]}
            </ThemedText>
            <Pressable
              onPress={() => stepMinute(-5)}
              style={[styles.stepBtn, { backgroundColor: theme.surface }]}
            >
              <ThemedText variant="h2">−</ThemedText>
            </Pressable>
          </View>

          <Pressable
            onPress={() => stepHour(12)}
            style={[
              styles.meridiemPill,
              { backgroundColor: theme.primaryMuted },
            ]}
          >
            <ThemedText variant="h2" color="primary">
              {clock.meridiem}
            </ThemedText>
          </Pressable>
        </View>
      </GlassCard>

      <GlassCard padding={18} style={styles.card}>
        <ThemedText variant="caption" color="secondary" weight="semiBold">
          Label
        </ThemedText>
        <TextInput
          value={label}
          onChangeText={setLabel}
          placeholder="Wake-Up Alarm"
          placeholderTextColor={theme.textMuted}
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        />

        <ThemedText variant="caption" color="secondary" weight="semiBold">
          Repeat Days (empty = once)
        </ThemedText>
        <View style={styles.daysRow}>
          {DAY_CHIPS.map((item) => {
            const active = days.includes(item.day);
            return (
              <Pressable
                key={item.day}
                onPress={() => toggleDay(item.day)}
                style={[
                  styles.dayChip,
                  {
                    backgroundColor: active ? theme.primary : theme.surface,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <ThemedText
                  variant="caption"
                  weight="semiBold"
                  style={{ color: active ? "#FFFFFF" : theme.textSecondary }}
                >
                  {item.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ThemedText variant="caption" color="secondary" weight="semiBold">
          Snooze Duration
        </ThemedText>
        <SegmentedControl<"5" | "10" | "15">
          value={snoozeMinutes}
          onChange={setSnoozeMinutes}
          options={[
            { value: "5", label: "5 min" },
            { value: "10", label: "10 min" },
            { value: "15", label: "15 min" },
          ]}
        />

        <View style={styles.switchRow}>
          <ThemedText variant="cardTitle">Vibrate</ThemedText>
          <Switch
            value={vibrate}
            onValueChange={setVibrate}
            trackColor={{ false: theme.border, true: theme.primary }}
          />
        </View>

        <View style={styles.switchRow}>
          <ThemedText variant="cardTitle">Alarm Enabled</ThemedText>
          <Switch
            value={isEnabled}
            onValueChange={setIsEnabled}
            trackColor={{ false: theme.border, true: theme.primary }}
          />
        </View>
      </GlassCard>

      <GlassCard padding={18} style={styles.card}>
        <ThemedText variant="caption" color="secondary" weight="semiBold">
          Alarm Sound (Tap to Preview)
        </ThemedText>
        {ALARM_SOUNDS.map((sound) => {
          const selected = soundKey === sound.key;
          return (
            <Pressable
              key={sound.key}
              onPress={() => handlePreviewSound(sound.key)}
              style={[
                styles.soundRow,
                {
                  borderColor: selected ? theme.primary : theme.border,
                  backgroundColor: selected
                    ? theme.primaryMuted
                    : theme.surface,
                },
              ]}
            >
              <View style={{ flex: 1 }}>
                <ThemedText variant="cardTitle">{sound.label}</ThemedText>
                <ThemedText variant="caption" color="secondary">
                  {sound.description}
                </ThemedText>
              </View>
              {selected ? (
                <AppIcon name="check-circle" size={18} color={theme.primary} />
              ) : null}
            </Pressable>
          );
        })}
      </GlassCard>

      <Button
        title="Save Alarm"
        variant="gradient"
        size="lg"
        fullWidth
        loading={upsertMutation.isPending}
        onPress={handleSave}
      />
    </ScreenWrapper>
  );
};

export const AlarmEditorScreen: React.FC = () => {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: existing } = useAlarmById(id);

  return (
    <AlarmEditorForm
      key={existing ? `${existing.id}_${existing.hour}_${existing.minute}` : "new"}
      existing={existing}
    />
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  timePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
  },
  stepperCol: {
    alignItems: "center",
    gap: 8,
  },
  stepBtn: {
    width: 48,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  meridiemPill: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginLeft: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
  },
  dayChip: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  soundRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
});
