import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import * as Haptics from "expo-haptics";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { GlassCard } from "@/components/ui/GlassCard";
import { useTranslation } from "@/i18n";
import type { RoutineBlock, RoutineBlockType } from "@/modules/routine/types/routine.types";
import { ACTIVITY_STATUS_LABELS } from "@/modules/tasks/utils/schedule";
import { useTheme } from "@/theme/tokens";

const BLOCK_ICON: Record<RoutineBlockType, string> = {
  wake_up: "sunrise",
  morning_routine: "sun",
  prayer: "moon",
  work_study: "briefcase",
  meals: "coffee",
  gym: "dumbbell",
  personal: "heart",
  evening_routine: "book-open",
  sleep: "moon",
};

export interface RoutineBlockCardProps {
  block: RoutineBlock;
  onCompleteToggle: (block: RoutineBlock) => void;
  onPress: (block: RoutineBlock) => void;
}

export const RoutineBlockCard: React.FC<RoutineBlockCardProps> = ({
  block,
  onCompleteToggle,
  onPress,
}) => {
  const theme = useTheme();
  const { isRTL } = useTranslation();

  const pillarColor =
    block.pillar === "spirituality"
      ? theme.pillarSpirituality
      : block.pillar === "health"
        ? theme.pillarHealth
        : theme.pillarProductivity;

  const isCompleted = block.todayStatus === "completed";

  return (
    <GlassCard
      padding={14}
      onPress={() => onPress(block)}
      style={!block.isEnabled ? { opacity: 0.55 } : undefined}
    >
      <View
        style={[
          styles.row,
          { flexDirection: isRTL ? "row-reverse" : "row" },
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: `${pillarColor}20` }]}>
          <AppIcon name={BLOCK_ICON[block.blockType] ?? "clock"} size={18} color={pillarColor} />
        </View>

        <View style={styles.content}>
          <ThemedText variant="cardTitle" numberOfLines={1}>
            {block.title}
          </ThemedText>
          <ThemedText variant="caption" color="secondary" numberOfLines={1}>
            {block.startTime} – {block.endTime} · {ACTIVITY_STATUS_LABELS[block.todayStatus]}
          </ThemedText>
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onCompleteToggle(block);
          }}
          hitSlop={8}
          style={[
            styles.checkCircle,
            {
              backgroundColor: isCompleted ? theme.success : "transparent",
              borderColor: isCompleted ? theme.success : theme.border,
            },
          ]}
        >
          {isCompleted ? (
            <AppIcon name="check" size={14} color="#FFFFFF" strokeWidth={2.5} />
          ) : null}
        </Pressable>
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    gap: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    gap: 2,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.75,
    alignItems: "center",
    justifyContent: "center",
  },
});
