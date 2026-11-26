import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { GlassCard } from "@/components/ui/GlassCard";
import { useTranslation } from "@/i18n";
import { useAuthStore } from "@/modules/auth/store/useAuthStore";
import { useCompanionStore } from "@/store/useCompanionStore";
import { useTheme } from "@/theme/tokens";

interface SettingRowItem {
  key: string;
  icon: string;
  titleKey: string;
  defaultTitle: string;
  subtitle: string;
  accent: string;
}

export const ProfileScreen: React.FC = () => {
  const theme = useTheme();
  const { t, isRTL } = useTranslation();
  const userName = useCompanionStore((s) => s.userName);
  const sleepSchedule = useCompanionStore((s) => s.sleepSchedule);
  const authUser = useAuthStore((s) => s.user);
  const displayTitle =
    (typeof authUser?.user_metadata?.display_name === "string" &&
      authUser.user_metadata.display_name.trim()) ||
    userName;

  const rows: SettingRowItem[] = [
    {
      key: "goals",
      icon: "target",
      titleKey: "profile.goals",
      defaultTitle: "User Goals",
      subtitle: "Spirituality, Health & Productivity weights",
      accent: theme.pillarProductivity,
    },
    {
      key: "notifications",
      icon: "bell",
      titleKey: "profile.notifications",
      defaultTitle: "Notifications & Alarms",
      subtitle: "Gentle alerts, quiet hours & chimes",
      accent: theme.warning,
    },
    {
      key: "prayer",
      icon: "moon",
      titleKey: "profile.prayer",
      defaultTitle: "Prayer Settings",
      subtitle: "Calculation method, offsets & focus mode",
      accent: theme.pillarSpirituality,
    },
    {
      key: "sleep",
      icon: "sunrise",
      titleKey: "profile.sleep",
      defaultTitle: "Sleep Schedule",
      subtitle: `${sleepSchedule.bedtime} – ${sleepSchedule.wakeTime}`,
      accent: theme.info,
    },
    {
      key: "appearance",
      icon: "sliders",
      titleKey: "profile.appearance",
      defaultTitle: "Appearance & Language",
      subtitle: "Light / Dark theme, English & العربية",
      accent: theme.primary,
    },
    {
      key: "privacy",
      icon: "shield",
      titleKey: "profile.privacy",
      defaultTitle: "Privacy & Data",
      subtitle: "Local-first storage & AI context controls",
      accent: theme.pillarHealth,
    },
  ];

  return (
    <ScreenWrapper>
      <ThemedText variant="h1">{t("profile.title", "Settings")}</ThemedText>

      <GlassCard
        elevated
        padding={16}
        onPress={() => router.push("/(modals)/cloud-account")}
      >
        <View
          style={[
            styles.profileRow,
            { flexDirection: isRTL ? "row-reverse" : "row" },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: theme.primaryMuted }]}>
            <ThemedText variant="h2" color="primary">
              {displayTitle.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <ThemedText variant="cardTitle">{displayTitle}</ThemedText>
            <ThemedText variant="caption" color="secondary">
              {authUser?.email
                ? `${authUser.email} · Cloud Sync Active`
                : "Cloud Backup & Sync · Tap to sign in"}
            </ThemedText>
          </View>
          <AppIcon
            name={isRTL ? "chevron-left" : "chevron-right"}
            size={18}
            color={theme.textMuted}
          />
        </View>
      </GlassCard>

      <GlassCard padding={6}>
        {rows.map((item, idx) => (
          <Pressable
            key={item.key}
            onPress={() => router.push(`/(modals)/settings/${item.key}`)}
            style={[
              styles.settingRow,
              {
                flexDirection: isRTL ? "row-reverse" : "row",
                borderBottomWidth: idx < rows.length - 1 ? StyleSheet.hairlineWidth : 0,
                borderBottomColor: theme.border,
              },
            ]}
          >
            <View
              style={[
                styles.iconBadge,
                { backgroundColor: `${item.accent}1E` },
              ]}
            >
              <AppIcon name={item.icon} size={18} color={item.accent} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <ThemedText variant="cardTitle">
                {t(item.titleKey, item.defaultTitle)}
              </ThemedText>
              <ThemedText variant="caption" color="secondary" numberOfLines={1}>
                {item.subtitle}
              </ThemedText>
            </View>
            <AppIcon
              name={isRTL ? "chevron-left" : "chevron-right"}
              size={18}
              color={theme.textMuted}
            />
          </Pressable>
        ))}
      </GlassCard>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  profileRow: {
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  settingRow: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  iconBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
