import { useMemo } from "react";
import { PixelRatio, StyleSheet, useWindowDimensions } from "react-native";
import { ThemeTokens, useTheme } from "@/theme/tokens";

export const BASE_WIDTH = 375;
export const BASE_HEIGHT = 812;

export const Breakpoints = {
  xs: 0,
  sm: 360,
  md: 480,
  lg: 768,
  xl: 1024,
} as const;

export type Breakpoint = keyof typeof Breakpoints;

function clampScale(scale: number, min = 0.88, max = 1.35): number {
  return Math.min(Math.max(scale, min), max);
}

export function rW(size: number, windowWidth = BASE_WIDTH): number {
  const scale = clampScale(windowWidth / BASE_WIDTH);
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
}

export function rH(size: number, windowHeight = BASE_HEIGHT): number {
  const scale = clampScale(windowHeight / BASE_HEIGHT);
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
}

export function rFS(size: number, windowWidth = BASE_WIDTH): number {
  const scale = clampScale(windowWidth / BASE_WIDTH, 0.88, 1.3);
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
}

export function rSp(size: number, windowWidth = BASE_WIDTH): number {
  const scale = clampScale(windowWidth / BASE_WIDTH, 0.88, 1.35);
  return Math.round(PixelRatio.roundToNearestPixel(size * scale));
}

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  const isCompact = width < Breakpoints.sm;
  const isTablet = width >= Breakpoints.lg;
  const orientation = width >= height ? ("landscape" as const) : ("portrait" as const);

  let breakpoint: Breakpoint = "xs";
  if (width >= Breakpoints.xl) breakpoint = "xl";
  else if (width >= Breakpoints.lg) breakpoint = "lg";
  else if (width >= Breakpoints.md) breakpoint = "md";
  else if (width >= Breakpoints.sm) breakpoint = "sm";

  const scaling = useMemo(
    () => ({
      rW: (size: number) => rW(size, width),
      rH: (size: number) => rH(size, height),
      rFS: (size: number) => rFS(size, width),
      rSp: (size: number) => rSp(size, width),
    }),
    [width, height],
  );

  return {
    width,
    height,
    isCompact,
    isTablet,
    orientation,
    breakpoint,
    contentMaxWidth: isTablet ? 960 : 540,
    ...scaling,
  };
}

export type ResponsiveContext = ReturnType<typeof useResponsive>;

export function useResponsiveStyle<
  T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>,
>(styleFactory: (theme: ThemeTokens, responsive: ResponsiveContext) => T): T {
  const theme = useTheme();
  const responsive = useResponsive();

  return useMemo(() => {
    const raw = styleFactory(theme, responsive);
    return StyleSheet.create(raw);
  }, [theme, responsive, styleFactory]);
}
