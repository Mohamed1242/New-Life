import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { router } from "expo-router";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { SimpleHeader } from "@/components/common/SimpleHeader";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { toast } from "@/shared/toast/ToastContext";
import { useTheme } from "@/theme/tokens";
import { useCreateWorkoutMutation } from "../hooks/useWorkouts";
import {
  WORKOUT_TYPE_META,
  type ExerciseSetInput,
  type WorkoutType,
} from "../types/workout.types";

const DURATION_PRESETS = [20, 30, 45, 60];

export const WorkoutEditorScreen: React.FC = () => {
  const theme = useTheme();
  const createWorkout = useCreateWorkoutMutation();

  const [title, setTitle] = useState("");
  const [workoutType, setWorkoutType] = useState<WorkoutType>("strength");
  const [durationMin, setDurationMin] = useState(45);
  const [effort, setEffort] = useState(7);
  const [notes, setNotes] = useState("");
  const [exName, setExName] = useState("");
  const [exReps, setExReps] = useState("10");
  const [exWeight, setExWeight] = useState("20");
  const [exercises, setExercises] = useState<ExerciseSetInput[]>([]);

  const handleAddExercise = () => {
    const clean = exName.trim();
    if (!clean) return;
    setExercises((prev) => [
      ...prev,
      {
        exerciseName: clean,
        reps: Number(exReps) || null,
        weightKg: Number(exWeight) || null,
      },
    ]);
    setExName("");
  };

  const handleSave = async () => {
    await createWorkout.mutateAsync({
      title: title.trim() || `${WORKOUT_TYPE_META[workoutType].label} Workout`,
      workoutType,
      durationMin,
      perceivedEffort: effort,
      notes,
      exercises,
    });
    toast.success("Workout logged!");
    router.back();
  };

  return (
    <ScreenWrapper includeTabBarClearance={false}>
      <SimpleHeader title="Log Workout" />

      <GlassCard padding={18} style={styles.card}>
        <ThemedText variant="caption" color="secondary" weight="semiBold">
          Workout Type
        </ThemedText>
        <SegmentedControl<WorkoutType>
          value={workoutType}
          onChange={setWorkoutType}
          options={[
            { value: "strength", label: "Strength" },
            { value: "cardio", label: "Cardio" },
            { value: "mobility", label: "Mobility" },
            { value: "sports", label: "Sports" },
          ]}
        />

        <ThemedText variant="caption" color="secondary" weight="semiBold">
          Session Title
        </ThemedText>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder={`e.g., Upper Body ${WORKOUT_TYPE_META[workoutType].label}`}
          placeholderTextColor={theme.textMuted}
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.element,
              borderColor: theme.border,
            },
          ]}
        />

        <ThemedText variant="caption" color="secondary" weight="semiBold">
          Duration ({durationMin} min)
        </ThemedText>
        <View style={styles.chipRow}>
          {DURATION_PRESETS.map((mins) => {
            const active = durationMin === mins;
            return (
              <Pressable
                key={mins}
                onPress={() => setDurationMin(mins)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primaryMuted : theme.element,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <ThemedText
                  variant="caption"
                  weight="semiBold"
                  color={active ? "primary" : "secondary"}
                >
                  {mins}m
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <ThemedText variant="caption" color="secondary" weight="semiBold">
          Perceived Effort ({effort}/10)
        </ThemedText>
        <View style={styles.chipRow}>
          {[4, 6, 7, 8, 9].map((lvl) => {
            const active = effort === lvl;
            return (
              <Pressable
                key={lvl}
                onPress={() => setEffort(lvl)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active ? theme.primaryMuted : theme.element,
                    borderColor: active ? theme.primary : theme.border,
                  },
                ]}
              >
                <ThemedText
                  variant="caption"
                  weight="semiBold"
                  color={active ? "primary" : "secondary"}
                >
                  RPE {lvl}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <GlassCard padding={18} style={styles.card}>
        <ThemedText variant="cardTitle">Exercises (Optional)</ThemedText>
        <View style={styles.exInputRow}>
          <TextInput
            value={exName}
            onChangeText={setExName}
            placeholder="Exercise (e.g., Push-ups)"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              {
                flex: 2,
                color: theme.text,
                backgroundColor: theme.element,
                borderColor: theme.border,
              },
            ]}
          />
          <TextInput
            value={exReps}
            onChangeText={setExReps}
            placeholder="Reps"
            keyboardType="numeric"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              {
                flex: 1,
                color: theme.text,
                backgroundColor: theme.element,
                borderColor: theme.border,
              },
            ]}
          />
          <TextInput
            value={exWeight}
            onChangeText={setExWeight}
            placeholder="kg"
            keyboardType="numeric"
            placeholderTextColor={theme.textMuted}
            style={[
              styles.input,
              {
                flex: 1,
                color: theme.text,
                backgroundColor: theme.element,
                borderColor: theme.border,
              },
            ]}
          />
        </View>
        <Button
          title="+ Add Exercise"
          variant="outline"
          size="sm"
          onPress={handleAddExercise}
        />

        {exercises.map((ex, idx) => (
          <View
            key={`${ex.exerciseName}_${idx}`}
            style={[
              styles.exItem,
              { borderColor: theme.border, backgroundColor: theme.element },
            ]}
          >
            <ThemedText variant="bodyMedium" style={{ flex: 1 }}>
              {ex.exerciseName}
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              {ex.reps ? `${ex.reps} reps` : ""}{" "}
              {ex.weightKg ? `· ${ex.weightKg} kg` : ""}
            </ThemedText>
            <Pressable
              onPress={() =>
                setExercises((prev) => prev.filter((_, i) => i !== idx))
              }
              hitSlop={8}
            >
              <AppIcon name="x" size={14} color={theme.textMuted} />
            </Pressable>
          </View>
        ))}

        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (energy, soreness, focus)..."
          placeholderTextColor={theme.textMuted}
          style={[
            styles.input,
            {
              color: theme.text,
              backgroundColor: theme.element,
              borderColor: theme.border,
            },
          ]}
        />
      </GlassCard>

      <Button
        title="Save Workout Session"
        variant="gradient"
        size="lg"
        fullWidth
        loading={createWorkout.isPending}
        onPress={handleSave}
      />
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  exInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  exItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
});
