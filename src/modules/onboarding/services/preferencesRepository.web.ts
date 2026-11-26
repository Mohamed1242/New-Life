import type { CoachingTone, UserPreferences } from "../types/preferences.types";

const STORAGE_KEY = "newlife_web_preferences_v1";

const DEFAULT_PREFS: UserPreferences = {
  displayName: "Ahmed",
  onboardingCompleted: false,
  coachingTone: "gentle",
  selectedGoals: [
    "Build consistent daily prayers",
    "Exercise & eat mindfully",
  ],
  prayerAutoMute: true,
  bedtime: "22:45",
  wakeTime: "05:15",
};

function readStore(): UserPreferences {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
      }
    }
  } catch {
    // ignore storage errors
  }
  return { ...DEFAULT_PREFS };
}

function writeStore(next: UserPreferences): void {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
  } catch {
    // ignore storage errors
  }
}

export const preferencesDb = {
  async getPreferences(): Promise<UserPreferences> {
    return readStore();
  },

  async saveOnboarding(input: {
    displayName: string;
    selectedGoals: string[];
    coachingTone: CoachingTone;
  }): Promise<void> {
    const curr = readStore();
    writeStore({
      ...curr,
      displayName: input.displayName.trim() || "Ahmed",
      selectedGoals: input.selectedGoals,
      coachingTone: input.coachingTone,
      onboardingCompleted: true,
    });
  },

  async updateDisplayName(displayName: string): Promise<void> {
    const clean = displayName.trim();
    if (!clean) return;
    const curr = readStore();
    writeStore({ ...curr, displayName: clean });
  },

  async updatePrayerAutoMute(enabled: boolean): Promise<void> {
    const curr = readStore();
    writeStore({ ...curr, prayerAutoMute: enabled });
  },

  async updateSleepSchedule(bedtime: string, wakeTime: string): Promise<void> {
    const curr = readStore();
    writeStore({ ...curr, bedtime, wakeTime });
  },

  async resetOnboardingAndDemo(): Promise<void> {
    const curr = readStore();
    writeStore({ ...curr, onboardingCompleted: false });
  },
};
