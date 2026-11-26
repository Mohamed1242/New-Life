import { Platform, ViewStyle } from "react-native";

export type AppFontWeight =
  | "regular"
  | "medium"
  | "semiBold"
  | "bold"
  | "extraBold";

export const EnglishFonts = {
  regular: "Poppins-Regular",
  medium: "Poppins-Medium",
  semiBold: "Poppins-SemiBold",
  bold: "Poppins-Bold",
  extraBold: "Poppins-Bold",
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
} as const;

export const ArabicFonts = {
  regular: "Tajawal-Regular",
  medium: "Tajawal-Medium",
  semiBold: "Tajawal-Bold",
  bold: "Tajawal-Bold",
  extraBold: "Tajawal-Bold",
  mono: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
} as const;

export function getFontFamily(
  weight: AppFontWeight = "regular",
  isRTL = false,
): string {
  const set = isRTL ? ArabicFonts : EnglishFonts;
  return set[weight] ?? set.regular;
}

export function fontWeightToFamily(fontWeight: unknown): AppFontWeight {
  if (fontWeight == null || fontWeight === "normal" || fontWeight === "regular") {
    return "regular";
  }
  const numeric =
    typeof fontWeight === "number" ? fontWeight : parseInt(String(fontWeight), 10);
  if (!Number.isNaN(numeric)) {
    if (numeric >= 800) return "extraBold";
    if (numeric >= 700) return "bold";
    if (numeric >= 600) return "semiBold";
    if (numeric >= 500) return "medium";
    return "regular";
  }
  const w = String(fontWeight).toLowerCase();
  if (w === "bold") return "bold";
  if (w === "medium") return "medium";
  if (w.includes("semi")) return "semiBold";
  return "regular";
}

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
} as const;

export const Radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 9999,
} as const;

export const GlassShadowLight: ViewStyle = {
  shadowColor: "#2B256B",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.06,
  shadowRadius: 16,
  elevation: 3,
};
