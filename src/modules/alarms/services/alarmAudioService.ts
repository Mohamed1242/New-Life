import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import type { AlarmSoundKey } from "../types/alarm.types";

const SOUND_ASSETS: Record<AlarmSoundKey, number> = {
  gentle_dawn: require("../../../../assets/sounds/gentle_dawn.wav") as number,
  chime_soft: require("../../../../assets/sounds/chime_soft.wav") as number,
  amber_bell: require("../../../../assets/sounds/amber_bell.wav") as number,
  adhan_chime: require("../../../../assets/sounds/adhan_chime.wav") as number,
};

let activePlayer: AudioPlayer | null = null;

export const alarmAudioService = {
  async playSound(key: AlarmSoundKey, loop = false): Promise<void> {
    alarmAudioService.stop();
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        shouldPlayInBackground: false,
        interruptionMode: "duckOthers",
      }).catch(() => {});

      const asset = SOUND_ASSETS[key] ?? SOUND_ASSETS.gentle_dawn;
      const player = createAudioPlayer(asset);
      player.loop = loop;
      player.play();
      activePlayer = player;
    } catch {
      // Audio playback gracefully ignored if restricted by browser autoplay policy
    }
  },

  stop(): void {
    if (!activePlayer) return;
    try {
      activePlayer.pause();
      activePlayer.remove();
    } catch {
      // ignore cleanup errors
    }
    activePlayer = null;
  },
};
