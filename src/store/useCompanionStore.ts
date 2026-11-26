import { create } from "zustand";
import { getTodayIso } from "@/core/utils/date";
import { preferencesDb } from "@/modules/onboarding/services/preferencesRepository";
import type { CoachingTone } from "@/modules/onboarding/types/preferences.types";
import { appLogger } from "@/shared/logger";

interface CompanionState {
  isHydrated: boolean;
  hydrationError: string | null;
  onboardingCompleted: boolean;
  userName: string;
  coachingTone: CoachingTone;
  selectedGoals: string[];
  selectedDate: string;
  prayerAutoMute: boolean;
  sleepSchedule: { bedtime: string; wakeTime: string };
  hydrateFromDb: () => Promise<void>;
  setSelectedDate: (dateIso: string) => void;
  completeOnboarding: (input: {
    displayName: string;
    selectedGoals: string[];
    coachingTone: CoachingTone;
  }) => Promise<void>;
  setDisplayName: (name: string) => Promise<void>;
  setPrayerAutoMute: (enabled: boolean) => Promise<void>;
  setSleepSchedule: (bedtime: string, wakeTime: string) => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

export const useCompanionStore = create<CompanionState>((set) => ({
  isHydrated: false,
  hydrationError: null,
  onboardingCompleted: false,
  userName: "Ahmed",
  coachingTone: "gentle",
  selectedGoals: [],
  selectedDate: getTodayIso(),
  prayerAutoMute: true,
  sleepSchedule: { bedtime: "22:45", wakeTime: "05:15" },

  hydrateFromDb: async () => {
    try {
      const prefs = await preferencesDb.getPreferences();
      set({
        isHydrated: true,
        hydrationError: null,
        onboardingCompleted: prefs.onboardingCompleted,
        userName: prefs.displayName,
        coachingTone: prefs.coachingTone,
        selectedGoals: prefs.selectedGoals,
        prayerAutoMute: prefs.prayerAutoMute,
        sleepSchedule: {
          bedtime: prefs.bedtime,
          wakeTime: prefs.wakeTime,
        },
      });
    } catch (error) {
      appLogger.error("Failed to hydrate preferences from SQLite", { error });
      set({
        isHydrated: true,
        hydrationError: "Could not load saved preferences",
      });
    }
  },

  setSelectedDate: (dateIso) => set({ selectedDate: dateIso }),

  completeOnboarding: async (input) => {
    await preferencesDb.saveOnboarding(input);
    set({
      onboardingCompleted: true,
      userName: input.displayName.trim() || "Ahmed",
      selectedGoals: input.selectedGoals,
      coachingTone: input.coachingTone,
    });
  },

  setPrayerAutoMute: async (enabled) => {
    await preferencesDb.updatePrayerAutoMute(enabled);
    set({ prayerAutoMute: enabled });
  },

  setDisplayName: async (name) => {
    const clean = name.trim();
    if (!clean) return;
    await preferencesDb.updateDisplayName(clean);
    set({ userName: clean });
  },

  setSleepSchedule: async (bedtime, wakeTime) => {
    await preferencesDb.updateSleepSchedule(bedtime, wakeTime);
    set({ sleepSchedule: { bedtime, wakeTime } });
  },

  resetOnboarding: async () => {
    await preferencesDb.resetOnboardingAndDemo();
    set({ onboardingCompleted: false });
  },
}));
