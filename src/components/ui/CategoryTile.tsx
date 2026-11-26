import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { CategoryDefinition } from "@/constants/categories";
import { Radii } from "@/constants/theme";
import { useTranslation } from "@/i18n";
import { useTheme } from "@/theme/tokens";

export interface CategoryTileProps {
  category: CategoryDefinition;
  selected: boolean;
  onPress: () => void;
}

export const CategoryTile: React.FC<CategoryTileProps> = ({
  category,
  selected,
  onPress,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.tile,
        {
          backgroundColor: selected ? theme.primaryMuted : theme.glassSurface,
          borderColor: selected ? theme.primary : theme.glassBorder,
        },
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: `${category.accentHex}22` },
        ]}
      >
        <AppIcon name={category.iconName} size={18} color={category.accentHex} />
      </View>
      <ThemedText
        variant="caption"
        weight={selected ? "semiBold" : "medium"}
        color={selected ? "primary" : "default"}
        center
        numberOfLines={1}
      >
        {t(category.labelKey, category.defaultLabel)}
      </ThemedText>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  tile: {
    width: "31.5%",
    borderRadius: Radii.md,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 6,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
});
