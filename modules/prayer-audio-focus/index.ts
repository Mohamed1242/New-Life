import { requireOptionalNativeModule } from "expo-modules-core";

export interface PrayerAudioFocusCapabilities {
  supported: boolean;
  platform: string;
  mode: "duck_other_media" | "ios_focus_notification_only" | "expo_go_or_web";
  description: string;
}

export interface AudioFocusRequestResult {
  supported: boolean;
  granted: boolean;
  mode: string;
  reason?: string;
}

interface NativeAudioFocusModule {
  getCapabilities: () => PrayerAudioFocusCapabilities;
  requestPrayerDucking: () => AudioFocusRequestResult;
  abandonPrayerDucking: () => boolean;
}

const nativeMod =
  requireOptionalNativeModule<NativeAudioFocusModule>("PrayerAudioFocus");

export const prayerAudioFocusNative = {
  getCapabilities(): PrayerAudioFocusCapabilities {
    if (nativeMod) {
      try {
        return nativeMod.getCapabilities();
      } catch {
        // fallback below
      }
    }
    return {
      supported: false,
      platform: "expo_go_or_web",
      mode: "expo_go_or_web",
      description:
        "Android Audio Focus ducking requires an Android development/production build; in Expo Go and Web, Prayer Focus uses peaceful visual meditation mode.",
    };
  },

  requestPrayerDucking(): AudioFocusRequestResult {
    if (nativeMod) {
      try {
        return nativeMod.requestPrayerDucking();
      } catch (err) {
        return {
          supported: false,
          granted: false,
          mode: "error",
          reason: err instanceof Error ? err.message : "Audio focus request failed",
        };
      }
    }
    return {
      supported: false,
      granted: false,
      mode: "expo_go_or_web",
      reason: "Native Audio Focus module unavailable in Expo Go or Web.",
    };
  },

  abandonPrayerDucking(): boolean {
    if (nativeMod) {
      try {
        return nativeMod.abandonPrayerDucking();
      } catch {
        return false;
      }
    }
    return false;
  },
};
