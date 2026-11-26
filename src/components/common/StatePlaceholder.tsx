import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { useTheme } from "@/theme/tokens";
import { SkeletonGlass } from "./SkeletonGlass";

export type StatePlaceholderVariant = "empty" | "loading" | "error";

export interface StatePlaceholderProps {
  variant?: StatePlaceholderVariant;
  icon?: string;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const StatePlaceholder: React.FC<StatePlaceholderProps> = ({
  variant = "empty",
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}) => {
  const theme = useTheme();

  if (variant === "loading") {
    return (
      <View style={styles.loadingWrap}>
        <SkeletonGlass height={72} />
        <SkeletonGlass height={72} />
        {title ? (
          <View style={styles.loadingLabel}>
            <ActivityIndicator size="small" color={theme.primary} />
            <ThemedText variant="caption" color="secondary">
              {title}
            </ThemedText>
          </View>
        ) : null}
      </View>
    );
  }

  const isError = variant === "error";
  const resolvedIcon = icon ?? (isError ? "alert-circle" : "sun");
  const resolvedColor = isError ? theme.error : theme.primary;
  const resolvedBg = isError ? theme.errorMuted : theme.primaryMuted;

  return (
    <GlassCard style={styles.card}>
      <View style={[styles.iconBadge, { backgroundColor: resolvedBg }]}>
        <AppIcon name={resolvedIcon} size={22} color={resolvedColor} />
      </View>
      <ThemedText variant="cardTitle" center>
        {title ?? (isError ? "Something went wrong" : "Nothing here yet")}
      </ThemedText>
      {subtitle ? (
        <ThemedText variant="body" color="secondary" center style={styles.sub}>
          {subtitle}
        </ThemedText>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          size="sm"
          variant={isError ? "outline" : "primary"}
          onPress={onAction}
          style={styles.cta}
        />
      ) : null}
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    paddingVertical: 26,
    paddingHorizontal: 20,
    gap: 8,
  },
  loadingWrap: {
    gap: 10,
  },
  loadingLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 4,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  sub: {
    maxWidth: 280,
  },
  cta: {
    marginTop: 8,
  },
});
