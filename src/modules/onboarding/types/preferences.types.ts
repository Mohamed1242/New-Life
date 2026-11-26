export type CoachingTone = "gentle" | "direct";

export interface UserPreferences {
  displayName: string;
  onboardingCompleted: boolean;
  coachingTone: CoachingTone;
  selectedGoals: string[];
  prayerAutoMute: boolean;
  bedtime: string;
  wakeTime: string;
}
