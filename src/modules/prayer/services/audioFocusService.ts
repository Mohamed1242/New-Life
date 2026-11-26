import { Platform } from "react-native";
import {
  prayerAudioFocusNative,
  type AudioFocusRequestResult,
  type PrayerAudioFocusCapabilities,
} from "../../../../modules/prayer-audio-focus";

export type { AudioFocusRequestResult, PrayerAudioFocusCapabilities };

export const audioFocusService = {
  getCapabilities(): PrayerAudioFocusCapabilities {
    if (Platform.OS === "ios") {
      return {
        supported: false,
        platform: "ios",
        mode: "ios_focus_notification_only",
        description:
          "iOS does not allow third-party apps to mute or lower volume of external media apps. Prayer Focus runs with a silent countdown & Focus Mode reminder.",
      };
    }
    return prayerAudioFocusNative.getCapabilities();
  },

  requestPrayerFocus(): AudioFocusRequestResult {
    return prayerAudioFocusNative.requestPrayerDucking();
  },

  releasePrayerFocus(): boolean {
    return prayerAudioFocusNative.abandonPrayerDucking();
  },
};
