import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { ScreenWrapper } from "@/components/common/ScreenWrapper";
import { SimpleHeader } from "@/components/common/SimpleHeader";
import { AppIcon } from "@/components/icons/AppIcon";
import { ThemedInput } from "@/components/themed/ThemedInput";
import { ThemedText } from "@/components/themed/ThemedText";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { toast } from "@/shared/toast/ToastContext";
import { useTheme } from "@/theme/tokens";
import { authFormSchema, AuthFormValues } from "../schemas/auth.schema";
import { useAuthStore } from "../store/useAuthStore";

export const CloudAccountScreen: React.FC = () => {
  const theme = useTheme();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");

  const {
    isConfigured,
    isLoading,
    user,
    pendingSyncCount,
    syncMetadata,
    signIn,
    signUp,
    signOut,
    triggerSync,
    refreshSyncStats,
  } = useAuthStore();

  useEffect(() => {
    refreshSyncStats();
  }, [refreshSyncStats]);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthFormValues>({
    resolver: zodResolver(authFormSchema),
    defaultValues: {
      email: "",
      password: "",
      displayName: "",
    },
  });

  const onSubmit = async (values: AuthFormValues) => {
    try {
      if (authMode === "signin") {
        await signIn(values.email, values.password);
        toast.success("Signed in & synced");
      } else {
        await signUp(values.email, values.password, values.displayName ?? "");
        toast.success("Account created! Check your email if verification is enabled.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    }
  };

  return (
    <ScreenWrapper includeTabBarClearance={false}>
      <SimpleHeader title="Cloud Backup & Sync" />

      {!isConfigured ? (
        <GlassCard elevated padding={18} style={styles.cardGap}>
          <View style={[styles.badge, { backgroundColor: theme.warningMuted }]}>
            <AppIcon name="info" size={20} color={theme.warning} />
          </View>
          <ThemedText variant="cardTitle">Local-First Mode Active</ThemedText>
          <ThemedText variant="body" color="secondary">
            Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file to enable cloud authentication and multi-device synchronization. Your offline changes are safely queued locally ({pendingSyncCount} pending).
          </ThemedText>
        </GlassCard>
      ) : null}

      {user ? (
        <GlassCard elevated padding={18} style={styles.cardGap}>
          <ThemedText variant="h2">Connected Account</ThemedText>
          <ThemedText variant="body" color="secondary">
            {user.email}
          </ThemedText>

          <View style={[styles.statusBox, { backgroundColor: theme.element, borderColor: theme.border }]}>
            <ThemedText variant="caption" color="secondary">
              Pending Offline Changes: {pendingSyncCount}
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              Last Pushed: {syncMetadata.lastPushedAt ?? "Never"}
            </ThemedText>
            <ThemedText variant="caption" color="secondary">
              Last Pulled: {syncMetadata.lastPulledAt ?? "Never"}
            </ThemedText>
            <ThemedText variant="caption" color="primary">
              Status: {syncMetadata.lastSyncStatus}
            </ThemedText>
          </View>

          <Button
            title="Sync Now"
            variant="gradient"
            fullWidth
            loading={isLoading}
            onPress={async () => {
              await triggerSync();
              toast.success("Sync check finished");
            }}
          />
          <Button
            title="Sign Out"
            variant="outline"
            fullWidth
            onPress={() => signOut()}
          />
        </GlassCard>
      ) : (
        <GlassCard elevated padding={18} style={styles.cardGap}>
          <SegmentedControl
            value={authMode}
            onChange={setAuthMode}
            options={[
              { value: "signin", label: "Sign In" },
              { value: "signup", label: "Create Account" },
            ]}
          />

          {authMode === "signup" ? (
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, value } }) => (
                <ThemedInput
                  label="Display Name"
                  value={value ?? ""}
                  onChangeText={onChange}
                  placeholder="Ahmed"
                />
              )}
            />
          ) : null}

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <ThemedInput
                label="Email"
                value={value}
                onChangeText={onChange}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <ThemedInput
                label="Password"
                value={value}
                onChangeText={onChange}
                secureTextEntry
                placeholder="Minimum 6 characters"
                error={errors.password?.message}
              />
            )}
          />

          <Button
            title={authMode === "signin" ? "Sign In & Sync" : "Create Account"}
            variant="gradient"
            size="lg"
            fullWidth
            loading={isLoading}
            disabled={!isConfigured}
            onPress={handleSubmit(onSubmit)}
          />
        </GlassCard>
      )}
    </ScreenWrapper>
  );
};

const styles = StyleSheet.create({
  cardGap: {
    gap: 14,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
});
