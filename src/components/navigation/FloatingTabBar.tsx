import React from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";
import type { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { GlassShadowLight } from "@/constants/theme";
import { useTranslation } from "@/i18n";
import { useTheme } from "@/theme/tokens";

const TAB_ICONS: Record<string, string> = {
  home: "home",
  tasks: "check-circle",
  insights: "bar-chart-2",
  assistant: "message-circle",
  profile: "user",
};

type FloatingTabBarProps = Parameters<
  NonNullable<React.ComponentProps<typeof Tabs>["tabBar"]>
>[0];

export const FloatingTabBar: React.FC<FloatingTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isRTL } = useTranslation();

  const routes = isRTL ? [...state.routes].reverse() : state.routes;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.outerWrapper,
        { bottom: Math.max(insets.bottom, 10) + 4 },
      ]}
    >
      <View
        style={[
          styles.pillContainer,
          {
            borderColor: theme.tabBarBorder,
            backgroundColor:
              Platform.OS === "ios" ? "transparent" : theme.tabBarBg,
          },
          theme.mode === "light" ? GlassShadowLight : undefined,
        ]}
      >
        {Platform.OS === "ios" ? (
          <BlurView
            intensity={45}
            tint={theme.blurTint}
            style={[StyleSheet.absoluteFill, { borderRadius: 28 }]}
          />
        ) : null}
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: theme.tabBarBg, borderRadius: 28 },
          ]}
        />
        <View style={styles.tabsRow}>
          {routes.map((route) => {
            const { options } = descriptors[route.key];
            const routeIndex = state.routes.findIndex((r) => r.key === route.key);
            const isFocused = state.index === routeIndex;
            const label =
              typeof options.title === "string" ? options.title : route.name;
            const iconName = TAB_ICONS[route.name] ?? "circle";

            const onPress = () => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name, route.params);
              }
            };

            return (
              <Pressable
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                style={[
                  styles.tabButton,
                  isFocused && { backgroundColor: theme.primaryMuted },
                ]}
              >
                <AppIcon
                  name={iconName}
                  size={20}
                  color={isFocused ? theme.primary : theme.textMuted}
                />
                <ThemedText
                  variant="micro"
                  color={isFocused ? "primary" : "muted"}
                  center
                  numberOfLines={1}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerWrapper: {
    position: "absolute",
    left: 16,
    right: 16,
    alignItems: "center",
  },
  pillContainer: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 28,
    borderWidth: 1,
    overflow: "hidden",
  },
  tabsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 22,
    gap: 2,
  },
});
