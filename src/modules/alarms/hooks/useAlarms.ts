import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { alarmDb } from "../db/alarmRepository";
import { alarmScheduler } from "../services/alarmScheduler";
import type { AlarmItem, UpsertAlarmInput } from "../types/alarm.types";

export const ALARM_KEYS = {
  all: ["alarms"] as const,
  detail: (id: string) => ["alarms", id] as const,
};

export function useAlarms() {
  return useQuery({
    queryKey: ALARM_KEYS.all,
    queryFn: () => alarmDb.listAlarms(),
  });
}

export function useAlarmById(id: string | undefined) {
  return useQuery({
    queryKey: ALARM_KEYS.detail(id ?? "none"),
    queryFn: () => (id ? alarmDb.getAlarmById(id) : Promise.resolve(null)),
    enabled: Boolean(id),
  });
}

export function useUpsertAlarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: UpsertAlarmInput) => {
      const saved = await alarmDb.upsertAlarm(input);
      await alarmScheduler.scheduleAlarm(saved);
      return alarmDb.getAlarmById(saved.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALARM_KEYS.all });
    },
  });
}

export function useToggleAlarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; isEnabled: boolean }) => {
      const updated = await alarmDb.setAlarmEnabled(params.id, params.isEnabled);
      if (updated) {
        await alarmScheduler.scheduleAlarm(updated);
      }
      return updated;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALARM_KEYS.all });
    },
  });
}

export function useDeleteAlarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await alarmScheduler.cancelAlarmSchedule(id);
      await alarmDb.deleteAlarm(id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALARM_KEYS.all });
    },
  });
}

export function useAlarmActions() {
  const qc = useQueryClient();

  const snooze = useMutation({
    mutationFn: (alarm: AlarmItem) => alarmScheduler.snoozeAlarm(alarm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALARM_KEYS.all });
    },
  });

  const dismiss = useMutation({
    mutationFn: (alarm: AlarmItem) => alarmScheduler.dismissAlarm(alarm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ALARM_KEYS.all });
    },
  });

  return { snooze, dismiss };
}
