import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { I18nManager, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

export type Language = "en" | "ar";
const LANG_STORAGE_KEY = "@newlife/language";

const translations: Record<Language, Record<string, any>> = { en, ar };

let currentLanguageSnapshot: Language = "en";

export const languageService = {
  getLanguage: (): Language => currentLanguageSnapshot,
  loadStoredLanguage: async (): Promise<Language> => {
    try {
      const stored = await AsyncStorage.getItem(LANG_STORAGE_KEY);
      if (stored === "en" || stored === "ar") {
        currentLanguageSnapshot = stored;
        return stored;
      }
    } catch {
      // ignore storage errors
    }
    return "en";
  },
  setLanguage: async (lang: Language): Promise<void> => {
    currentLanguageSnapshot = lang;
    await AsyncStorage.setItem(LANG_STORAGE_KEY, lang).catch(() => {});
  },
};

export interface I18nContextValue {
  language: Language;
  isRTL: boolean;
  setLanguage: (lang: Language) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  t: (
    key: string,
    fallbackOrParams?: string | Record<string, string | number>,
    params?: Record<string, string | number>,
  ) => string;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

const syncRTL = (shouldBeRTL: boolean, lang: Language) => {
  try {
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
    }
    if (Platform.OS === "web" && typeof document !== "undefined") {
      document.documentElement.dir = shouldBeRTL ? "rtl" : "ltr";
      document.documentElement.lang = lang;
    }
  } catch {
    // ignore RTL errors on unsupported targets
  }
};

function resolvePath(obj: Record<string, any>, path: string): string | undefined {
  const parts = path.split(".");
  let curr: any = obj;
  for (const part of parts) {
    if (curr && typeof curr === "object" && part in curr) {
      curr = curr[part];
    } else {
      return undefined;
    }
  }
  return typeof curr === "string" ? curr : undefined;
}

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text;
  let output = text;
  Object.entries(params).forEach(([k, v]) => {
    output = output.replace(
      new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}|\\{\\s*${k}\\s*\\}`, "g"),
      String(v),
    );
  });
  return output;
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>(languageService.getLanguage());

  useEffect(() => {
    let active = true;
    languageService.loadStoredLanguage().then((lang) => {
      if (active) {
        setLangState(lang);
        syncRTL(lang === "ar", lang);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const setLanguage = useCallback(async (lang: Language) => {
    setLangState(lang);
    await languageService.setLanguage(lang);
    syncRTL(lang === "ar", lang);
  }, []);

  const toggleLanguage = useCallback(async () => {
    await setLanguage(language === "ar" ? "en" : "ar");
  }, [language, setLanguage]);

  const t = useCallback(
    (
      key: string,
      fallbackOrParams?: string | Record<string, string | number>,
      params?: Record<string, string | number>,
    ): string => {
      const fallback =
        typeof fallbackOrParams === "string" ? fallbackOrParams : undefined;
      const resolvedParams =
        typeof fallbackOrParams === "object" ? fallbackOrParams : params;

      const template =
        resolvePath(translations[language], key) ??
        resolvePath(translations.en, key) ??
        fallback ??
        key;

      return interpolate(template, resolvedParams);
    },
    [language],
  );

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      isRTL: language === "ar",
      setLanguage,
      toggleLanguage,
      t,
    }),
    [language, setLanguage, toggleLanguage, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within I18nProvider");
  }
  return ctx;
}
