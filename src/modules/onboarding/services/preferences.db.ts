import { getDatabase } from "@/core/db";
import type { CoachingTone, UserPreferences } from "../types/preferences.types";

interface PreferenceRow {
  display_name: string;
  onboarding_completed: number;
  coaching_tone: string;
  selected_goals_json: string;
  prayer_auto_mute: number;
  bedtime: string;
  wake_time: string;
}

export const preferencesDb = {
  async getPreferences(): Promise<UserPreferences> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<PreferenceRow>(
      "SELECT display_name, onboarding_completed, coaching_tone, selected_goals_json, prayer_auto_mute, bedtime, wake_time FROM user_preferences WHERE id = 1",
    );

    if (!row) {
      return {
        displayName: "Ahmed",
        onboardingCompleted: false,
        coachingTone: "gentle",
        selectedGoals: [],
        prayerAutoMute: true,
        bedtime: "22:45",
        wakeTime: "05:15",
      };
    }

    let parsedGoals: string[] = [];
    try {
      parsedGoals = JSON.parse(row.selected_goals_json);
    } catch {
      parsedGoals = [];
    }

    return {
      displayName: row.display_name,
      onboardingCompleted: row.onboarding_completed === 1,
      coachingTone: (row.coaching_tone as CoachingTone) || "gentle",
      selectedGoals: Array.isArray(parsedGoals) ? parsedGoals : [],
      prayerAutoMute: row.prayer_auto_mute === 1,
      bedtime: row.bedtime,
      wakeTime: row.wake_time,
    };
  },

  async saveOnboarding(input: {
    displayName: string;
    selectedGoals: string[];
    coachingTone: CoachingTone;
  }): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE user_preferences
       SET display_name = ?, onboarding_completed = 1, coaching_tone = ?, selected_goals_json = ?, updated_at = ?
       WHERE id = 1`,
      [
        input.displayName.trim() || "Ahmed",
        input.coachingTone,
        JSON.stringify(input.selectedGoals),
        new Date().toISOString(),
      ],
    );
  },

  async updatePrayerAutoMute(enabled: boolean): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE user_preferences SET prayer_auto_mute = ?, updated_at = ? WHERE id = 1",
      [enabled ? 1 : 0, new Date().toISOString()],
    );
  },

  async updateSleepSchedule(bedtime: string, wakeTime: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE user_preferences SET bedtime = ?, wake_time = ?, updated_at = ? WHERE id = 1",
      [bedtime, wakeTime, new Date().toISOString()],
    );
  },

  async resetOnboardingAndDemo(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      "UPDATE user_preferences SET onboarding_completed = 0, updated_at = ? WHERE id = 1",
      [new Date().toISOString()],
    );
  },
};
