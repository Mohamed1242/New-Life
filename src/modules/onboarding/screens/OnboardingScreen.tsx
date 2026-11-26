import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedInput } from "@/components/themed/ThemedInput";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { toast } from "@/shared/toast/ToastContext";
import { useCompanionStore } from "@/store/useCompanionStore";
import { useTheme } from "@/theme/tokens";
import {
  OnboardingFormValues,
  onboardingSchema,
} from "../schemas/onboarding.schema";

const GOALS = [
  "Build consistent daily prayers",
  "Exercise & eat mindfully",
  "Focus deeply on work & study",
  "Reduce late-night screen habits",
];

export const OnboardingScreen: React.FC = () => {
  const theme = useTheme();
  const completeOnboarding = useCompanionStore((s) => s.completeOnboarding);
  const userName = useCompanionStore((s) => s.userName);

  const [step, setStep] = useState(0);

  const {
    control,
    setValue,
    trigger,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      displayName: userName || "Ahmed",
      selectedGoals: [GOALS[0], GOALS[1]],
      coachingTone: "gentle",
    },
  });

  const selectedGoals = useWatch({ control, name: "selectedGoals" });
  const coachingTone = useWatch({ control, name: "coachingTone" });

  const toggleGoal = (goal: string) => {
    const next = selectedGoals.includes(goal)
      ? selectedGoals.filter((g) => g !== goal)
      : [...selectedGoals, goal];
    setValue("selectedGoals", next, { shouldValidate: true });
  };

  const onSubmit = async (values: OnboardingFormValues) => {
    try {
      await completeOnboarding(values);
      router.replace("/(tabs)/home");
    } catch {
      toast.error("Could not save your preferences");
    }
  };

  const handleNext = async () => {
    if (step === 0) {
      const valid = await trigger("displayName");
      if (!valid) return;
      setStep(1);
      return;
    }
    if (step === 1) {
      const valid = await trigger("selectedGoals");
      if (!valid) return;
      setStep(2);
      return;
    }
    await handleSubmit(onSubmit)();
  };

  return (
    <ScreenWrapper includeTabBarClearance={false}>
      <View style={styles.topBar}>
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  width: step === i ? 24 : 8,
                  backgroundColor: step === i ? theme.primary : theme.border,
                },
              ]}
            />
          ))}
        </View>
        <Pressable
          onPress={() => handleSubmit(onSubmit)()}
          disabled={isSubmitting}
        >
          <ThemedText variant="caption" color="secondary">
            Skip
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.body}>
        {step === 0 ? (
          <GlassCard elevated padding={22} style={styles.stepCard}>
            <View style={[styles.badge, { backgroundColor: theme.primaryMuted }]}>
              <AppIcon name="sun" size={24} color={theme.primary} />
            </View>
            <ThemedText variant="display">Welcome to New Life</ThemedText>
            <ThemedText variant="body" color="secondary">
              Your calm personal companion for habits, tasks, health, and spiritual rhythm.
            </ThemedText>
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, onBlur, value } }) => (
                <ThemedInput
                  label="What should I call you?"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  placeholder="Your first name"
                  error={errors.displayName?.message}
                />
              )}
            />
          </GlassCard>
        ) : null}

        {step === 1 ? (
          <GlassCard elevated padding={22} style={styles.stepCard}>
            <ThemedText variant="h1">What matters most right now?</ThemedText>
            <ThemedText variant="body" color="secondary">
              Choose your focus areas. We will shape your daily balance around them.
            </ThemedText>
            <View style={styles.goalList}>
              {GOALS.map((goal) => {
                const active = selectedGoals.includes(goal);
                return (
                  <Pressable
                    key={goal}
                    onPress={() => toggleGoal(goal)}
                    style={[
                      styles.goalOption,
                      {
                        backgroundColor: active ? theme.primaryMuted : theme.element,
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <ThemedText
                      variant="bodyMedium"
                      color={active ? "primary" : "default"}
                      style={{ flex: 1 }}
                    >
                      {goal}
                    </ThemedText>
                    <AppIcon
                      name={active ? "check-circle" : "circle"}
                      size={18}
                      color={active ? theme.primary : theme.textMuted}
                    />
                  </Pressable>
                );
              })}
            </View>
            {errors.selectedGoals?.message ? (
              <ThemedText variant="error" color="error">
                {errors.selectedGoals.message}
              </ThemedText>
            ) : null}
          </GlassCard>
        ) : null}

        {step === 2 ? (
          <GlassCard elevated padding={22} style={styles.stepCard}>
            <ThemedText variant="h1">How should I support you?</ThemedText>
            <ThemedText variant="body" color="secondary">
              Pick the coaching tone for your daily assistant and prayer reminders.
            </ThemedText>
            <View style={styles.goalList}>
              <Pressable
                onPress={() => setValue("coachingTone", "gentle")}
                style={[
                  styles.goalOption,
                  {
                    backgroundColor:
                      coachingTone === "gentle" ? theme.primaryMuted : theme.element,
                    borderColor:
                      coachingTone === "gentle" ? theme.primary : theme.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText variant="cardTitle">Gentle & Encouraging</ThemedText>
                  <ThemedText variant="caption" color="secondary">
                    Calm check-ins, forgiving streaks, peaceful nudges.
                  </ThemedText>
                </View>
              </Pressable>
              <Pressable
                onPress={() => setValue("coachingTone", "direct")}
                style={[
                  styles.goalOption,
                  {
                    backgroundColor:
                      coachingTone === "direct" ? theme.primaryMuted : theme.element,
                    borderColor:
                      coachingTone === "direct" ? theme.primary : theme.border,
                  },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <ThemedText variant="cardTitle">Focused & Direct</ThemedText>
                  <ThemedText variant="caption" color="secondary">
                    Concise action prompts and structured time blocks.
                  </ThemedText>
                </View>
              </Pressable>
            </View>
          </GlassCard>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Button
          title={step < 2 ? "Continue" : "Begin My Journey"}
          variant="gradient"
          size="lg"
          fullWidth
          loading={isSubmitting}
          onPress={handleNext}
        />
      </View>
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  body: {
    flex: 1,
    justifyContent: "center",
  },
  stepCard: {
    gap: 14,
  },
  badge: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  goalList: {
    gap: 10,
    marginTop: 6,
  },
  goalOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  footer: {
    paddingTop: 12,
  },
});
