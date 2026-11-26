import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useResponsive } from "@/theme/responsive";
import { AtmosphericBackground } from "./AtmosphericBackground";

export interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  includeTabBarClearance?: boolean;
  atmosphericVariant?: "default" | "prayer";
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
}

export const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  children,
  scrollable = true,
  includeTabBarClearance = true,
  atmosphericVariant = "default",
  contentContainerStyle,
  style,
}) => {
  const insets = useSafeAreaInsets();
  const { rSp, contentMaxWidth } = useResponsive();

  const bottomPad = includeTabBarClearance
    ? insets.bottom + 98
    : insets.bottom + rSp(20);

  const inner = scrollable ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: insets.top + rSp(10),
          paddingBottom: bottomPad,
          paddingHorizontal: rSp(20),
          maxWidth: contentMaxWidth,
          alignSelf: "center",
          width: "100%",
        },
        contentContainerStyle,
      ]}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.fixedContent,
        {
          paddingTop: insets.top + rSp(10),
          paddingBottom: bottomPad,
          paddingHorizontal: rSp(20),
          maxWidth: contentMaxWidth,
          alignSelf: "center",
          width: "100%",
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <AtmosphericBackground variant={atmosphericVariant}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {inner}
      </KeyboardAvoidingView>
    </AtmosphericBackground>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    gap: 14,
  },
  fixedContent: {
    flex: 1,
  },
});
