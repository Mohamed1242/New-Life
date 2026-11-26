import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { useTranslation } from "@/i18n";
import { useTheme } from "@/theme/tokens";

export interface SimpleHeaderProps {
  title: string;
  onBack?: () => void;
  rightSlot?: React.ReactNode;
}

export const SimpleHeader: React.FC<SimpleHeaderProps> = ({
  title,
  onBack,
  rightSlot,
}) => {
  const theme = useTheme();
  const { isRTL, t } = useTranslation();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)/home");
    }
  };

  return (
    <View
      style={[
        styles.row,
        { flexDirection: isRTL ? "row-reverse" : "row" },
      ]}
    >
      <Pressable
        onPress={handleBack}
        accessibilityRole="button"
        accessibilityLabel={t("common.back", "Back")}
        style={[
          styles.iconBtn,
          {
            backgroundColor: theme.glassSurface,
            borderColor: theme.glassBorder,
          },
        ]}
      >
        <AppIcon
          name={isRTL ? "chevron-right" : "chevron-left"}
          size={20}
          color={theme.text}
        />
      </Pressable>
      <ThemedText variant="h2" center style={styles.title} numberOfLines={1}>
        {title}
      </ThemedText>
      <View style={styles.rightSlot}>{rightSlot}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    paddingHorizontal: 10,
  },
  rightSlot: {
    minWidth: 40,
    alignItems: "flex-end",
  },
});
