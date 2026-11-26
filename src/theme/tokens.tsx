import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ThemeMode = "light" | "dark";
export type ThemePreference = ThemeMode | "system";

const THEME_STORAGE_KEY = "@newlife/theme_preference";

export interface ThemeTokens {
  mode: ThemeMode;
  // Brand
  primary: string;
  primaryHover: string;
  primaryMuted: string;
  gradientPrimary: readonly [string, string];
  // Atmospheric Backdrops
  background: string;
  backdropGradient: readonly [string, string, string];
  prayerGradient: readonly [string, string, string];
  // Glassmorphic Surfaces (Max 2 layers)
  glassSurface: string;
  glassSurfaceElevated: string;
  glassBorder: string;
  glassBorderStrong: string;
  blurTint: "light" | "dark";
  // Standard Surfaces
  surface: string;
  card: string;
  cardBorder: string;
  element: string;
  border: string;
  // Typography
  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;
  // Pillars
  pillarSpirituality: string;
  pillarSpiritualityMuted: string;
  pillarHealth: string;
  pillarHealthMuted: string;
  pillarProductivity: string;
  pillarProductivityMuted: string;
  // Semantics
  success: string;
  successMuted: string;
  warning: string;
  warningMuted: string;
  error: string;
  errorMuted: string;
  info: string;
  // Tab Bar & Chat Bubbles
  tabBarBg: string;
  tabBarBorder: string;
  bubbleIncoming: string;
  bubbleIncomingText: string;
  bubbleOutgoing: string;
  bubbleOutgoingText: string;
  overlayBackdrop: string;
}

export const Colors: Record<ThemeMode, ThemeTokens> = {
  light: {
    mode: "light",
    primary: "#5B4FE9",
    primaryHover: "#4A3ED6",
    primaryMuted: "rgba(91, 79, 233, 0.12)",
    gradientPrimary: ["#7064F7", "#5044E2"],

    background: "#F4F3FB",
    backdropGradient: ["#EAE6FA", "#F5F3FC", "#E3ECF9"],
    prayerGradient: ["#181E38", "#222B4F", "#12162A"],

    glassSurface: "rgba(255, 255, 255, 0.72)",
    glassSurfaceElevated: "rgba(255, 255, 255, 0.88)",
    glassBorder: "rgba(255, 255, 255, 0.70)",
    glassBorderStrong: "rgba(91, 79, 233, 0.25)",
    blurTint: "light",

    surface: "#FFFFFF",
    card: "rgba(255, 255, 255, 0.78)",
    cardBorder: "rgba(226, 232, 240, 0.85)",
    element: "rgba(241, 244, 252, 0.85)",
    border: "rgba(203, 213, 225, 0.65)",

    text: "#121324",
    textSecondary: "#5A5E7A",
    textMuted: "#8E93AD",
    textInverse: "#FFFFFF",

    pillarSpirituality: "#2AB88D",
    pillarSpiritualityMuted: "rgba(42, 184, 141, 0.14)",
    pillarHealth: "#F59E42",
    pillarHealthMuted: "rgba(245, 158, 66, 0.15)",
    pillarProductivity: "#6C5CE7",
    pillarProductivityMuted: "rgba(108, 92, 231, 0.14)",

    success: "#22A97A",
    successMuted: "rgba(34, 169, 122, 0.14)",
    warning: "#E8912D",
    warningMuted: "rgba(232, 145, 45, 0.14)",
    error: "#E56B6F",
    errorMuted: "rgba(229, 107, 111, 0.14)",
    info: "#3B82F6",

    tabBarBg: "rgba(255, 255, 255, 0.84)",
    tabBarBorder: "rgba(255, 255, 255, 0.85)",
    bubbleIncoming: "rgba(255, 255, 255, 0.82)",
    bubbleIncomingText: "#121324",
    bubbleOutgoing: "#5B4FE9",
    bubbleOutgoingText: "#FFFFFF",
    overlayBackdrop: "rgba(18, 19, 36, 0.42)",
  },
  dark: {
    mode: "dark",
    primary: "#7C72FF",
    primaryHover: "#9188FF",
    primaryMuted: "rgba(124, 114, 255, 0.20)",
    gradientPrimary: ["#857BFF", "#5B4FE9"],

    background: "#0B0D18",
    backdropGradient: ["#0D1021", "#151932", "#0A0C16"],
    prayerGradient: ["#0B0F20", "#17203F", "#090C18"],

    glassSurface: "rgba(24, 28, 48, 0.76)",
    glassSurfaceElevated: "rgba(32, 37, 62, 0.88)",
    glassBorder: "rgba(255, 255, 255, 0.10)",
    glassBorderStrong: "rgba(124, 114, 255, 0.40)",
    blurTint: "dark",

    surface: "#14182B",
    card: "rgba(24, 28, 48, 0.80)",
    cardBorder: "rgba(255, 255, 255, 0.10)",
    element: "rgba(35, 41, 68, 0.72)",
    border: "rgba(255, 255, 255, 0.12)",

    text: "#F4F5FA",
    textSecondary: "#A9AEC9",
    textMuted: "#6E7491",
    textInverse: "#121324",

    pillarSpirituality: "#34D399",
    pillarSpiritualityMuted: "rgba(52, 211, 153, 0.16)",
    pillarHealth: "#FBBF24",
    pillarHealthMuted: "rgba(251, 191, 36, 0.16)",
    pillarProductivity: "#8B7FFF",
    pillarProductivityMuted: "rgba(139, 127, 255, 0.18)",

    success: "#34D399",
    successMuted: "rgba(52, 211, 153, 0.16)",
    warning: "#FBBF24",
    warningMuted: "rgba(251, 191, 36, 0.16)",
    error: "#F28482",
    errorMuted: "rgba(242, 132, 130, 0.18)",
    info: "#60A5FA",

    tabBarBg: "rgba(22, 26, 46, 0.88)",
    tabBarBorder: "rgba(255, 255, 255, 0.12)",
    bubbleIncoming: "rgba(30, 35, 60, 0.85)",
    bubbleIncomingText: "#F4F5FA",
    bubbleOutgoing: "#6E62F5",
    bubbleOutgoingText: "#FFFFFF",
    overlayBackdrop: "rgba(5, 7, 15, 0.65)",
  },
};

interface ThemeContextValue {
  theme: ThemeTokens;
  mode: ThemeMode;
  preference: ThemePreference;
  isDark: boolean;
  setPreference: (pref: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useRNColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("light");

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((stored) => {
        if (!active) return;
        if (stored === "light" || stored === "dark" || stored === "system") {
          setPreferenceState(stored);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const setPreference = useCallback(async (pref: ThemePreference) => {
    setPreferenceState(pref);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, pref).catch(() => {});
  }, []);

  const mode: ThemeMode =
    preference === "system"
      ? systemScheme === "dark"
        ? "dark"
        : "light"
      : preference;

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: Colors[mode],
      mode,
      preference,
      isDark: mode === "dark",
      setPreference,
    }),
    [mode, preference, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeTokens {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return Colors.light;
  }
  return ctx.theme;
}

export function useThemeControls() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useThemeControls must be used inside ThemeProvider");
  }
  return ctx;
}
