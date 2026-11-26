import { Tabs } from "expo-router";
import { FloatingTabBar } from "@/components/navigation/FloatingTabBar";
import { useTranslation } from "@/i18n";

export default function TabsLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" options={{ title: t("tabs.home", "Home") }} />
      <Tabs.Screen name="tasks" options={{ title: t("tabs.tasks", "Tasks") }} />
      <Tabs.Screen name="insights" options={{ title: t("tabs.insights", "Insights") }} />
      <Tabs.Screen name="assistant" options={{ title: t("tabs.assistant", "Assistant") }} />
      <Tabs.Screen name="profile" options={{ title: t("tabs.profile", "Profile") }} />
    </Tabs>
  );
}
