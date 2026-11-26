import React from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AtmosphericBackground } from "@/components/common/AtmosphericBackground";
import { SkeletonGlass } from "@/components/common/SkeletonGlass";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { getFontFamily } from "@/constants/theme";
import { useTranslation } from "@/i18n";
import { useTheme } from "@/theme/tokens";
import { useAssistant } from "../hooks/useAssistant";

const QUICK_PROMPTS = [
  "Help me build a realistic morning routine",
  "Why am I missing evening habits?",
  "Suggest a gentle prayer reminder",
];

export const AssistantScreen: React.FC = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t, isRTL } = useTranslation();
  const {
    messages,
    draft,
    setDraft,
    isResponding,
    remainingToday,
    sendMessage,
    requestReview,
    confirmAction,
    dismissAction,
  } = useAssistant();

  return (
    <AtmosphericBackground>
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top + 10,
            paddingBottom: Math.max(insets.bottom, 10) + 84,
          },
        ]}
      >
        <View style={styles.header}>
          <View style={[styles.botAvatar, { backgroundColor: theme.primaryMuted }]}>
            <AppIcon name="sparkles" size={20} color={theme.primary} />
          </View>
          <ThemedText variant="h2" center>
            {t("assistant.title", "Your AI Assistant")}
          </ThemedText>
          <ThemedText variant="caption" color="secondary" center>
            {t("assistant.subtitle", "Always here to help you grow")}
            {remainingToday !== null ? ` · ${remainingToday} AI checks left today` : ""}
          </ThemedText>

          <View style={styles.reviewRow}>
            <Button
              title="Daily Review"
              size="sm"
              variant="glass"
              onPress={() => requestReview("daily_review")}
            />
            <Button
              title="Weekly Report"
              size="sm"
              variant="glass"
              onPress={() => requestReview("weekly_review")}
            />
          </View>
        </View>

        <ScrollView
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <View
                key={msg.id}
                style={[
                  styles.msgRow,
                  { alignItems: isUser ? "flex-end" : "flex-start" },
                ]}
              >
                <GlassCard
                  elevated={!isUser}
                  padding={14}
                  style={[
                    styles.bubble,
                    isUser && {
                      backgroundColor: theme.bubbleOutgoing,
                      borderColor: theme.bubbleOutgoing,
                    },
                  ]}
                >
                  <ThemedText
                    variant="body"
                    style={{
                      color: isUser
                        ? theme.bubbleOutgoingText
                        : theme.bubbleIncomingText,
                    }}
                  >
                    {msg.text}
                  </ThemedText>

                  {msg.model && !isUser ? (
                    <ThemedText variant="micro" color="muted" style={{ marginTop: 4 }}>
                      {msg.model}
                      {msg.cached ? " · cached" : ""}
                    </ThemedText>
                  ) : null}

                  {msg.actions && msg.actions.length > 0 && !msg.actionResolved ? (
                    <View
                      style={[
                        styles.actionRow,
                        { flexDirection: isRTL ? "row-reverse" : "row" },
                      ]}
                    >
                      {msg.actions.map((act) => (
                        <Button
                          key={act.id}
                          title={act.label}
                          size="sm"
                          variant="primary"
                          onPress={() => confirmAction(msg, act)}
                        />
                      ))}
                      <Button
                        title="Not Now"
                        size="sm"
                        variant="outline"
                        onPress={() => dismissAction(msg)}
                      />
                    </View>
                  ) : null}
                </GlassCard>
              </View>
            );
          })}
          {isResponding ? <SkeletonGlass height={58} /> : null}
        </ScrollView>

        <View style={styles.composerZone}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promptRow}
          >
            {QUICK_PROMPTS.map((prompt) => (
              <Pressable
                key={prompt}
                onPress={() => sendMessage(prompt)}
                style={[
                  styles.promptChip,
                  {
                    backgroundColor: theme.glassSurface,
                    borderColor: theme.glassBorder,
                  },
                ]}
              >
                <ThemedText variant="caption" color="primary" weight="medium">
                  {prompt}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>

          <View
            style={[
              styles.inputBar,
              {
                backgroundColor: theme.glassSurfaceElevated,
                borderColor: theme.glassBorder,
                flexDirection: isRTL ? "row-reverse" : "row",
              },
            ]}
          >
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={t("assistant.placeholder", "Ask me anything...")}
              placeholderTextColor={theme.textMuted}
              onSubmitEditing={() => sendMessage()}
              style={[
                styles.input,
                {
                  color: theme.text,
                  fontFamily: getFontFamily("regular", isRTL),
                  textAlign: isRTL ? "right" : "left",
                },
              ]}
            />
            <Pressable
              onPress={() => sendMessage()}
              style={[styles.sendBtn, { backgroundColor: theme.primary }]}
            >
              <AppIcon name="send" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>
    </AtmosphericBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 18,
  },
  header: {
    alignItems: "center",
    gap: 4,
    paddingBottom: 10,
  },
  botAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  reviewRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    gap: 12,
    paddingVertical: 10,
  },
  msgRow: {
    width: "100%",
  },
  bubble: {
    maxWidth: "88%",
    gap: 8,
  },
  actionRow: {
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  composerZone: {
    gap: 8,
    paddingTop: 6,
  },
  promptRow: {
    gap: 8,
  },
  promptChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
  },
  inputBar: {
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: "center",
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
