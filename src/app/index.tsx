import { Redirect } from "expo-router";
import { useCompanionStore } from "@/store/useCompanionStore";

export default function EntryIndex() {
  const onboardingCompleted = useCompanionStore(
    (state) => state.onboardingCompleted,
  );

  if (!onboardingCompleted) {
    return <Redirect href="/onboarding" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
