export type LifePillar = "spirituality" | "health" | "productivity";

export type CategorySlug =
  | "prayer"
  | "gym"
  | "health"
  | "work"
  | "study"
  | "custom";

export interface CategoryDefinition {
  id: CategorySlug;
  labelKey: string;
  defaultLabel: string;
  pillar: LifePillar;
  iconName: string;
  accentHex: string;
}

export const SYSTEM_CATEGORIES: CategoryDefinition[] = [
  {
    id: "prayer",
    labelKey: "categories.prayer",
    defaultLabel: "Prayer",
    pillar: "spirituality",
    iconName: "moon",
    accentHex: "#2AB88D",
  },
  {
    id: "gym",
    labelKey: "categories.gym",
    defaultLabel: "Gym",
    pillar: "health",
    iconName: "activity",
    accentHex: "#5B4FE9",
  },
  {
    id: "health",
    labelKey: "categories.health",
    defaultLabel: "Health",
    pillar: "health",
    iconName: "heart",
    accentHex: "#E56B6F",
  },
  {
    id: "work",
    labelKey: "categories.work",
    defaultLabel: "Work",
    pillar: "productivity",
    iconName: "briefcase",
    accentHex: "#E8912D",
  },
  {
    id: "study",
    labelKey: "categories.study",
    defaultLabel: "Study",
    pillar: "productivity",
    iconName: "book-open",
    accentHex: "#3B82F6",
  },
  {
    id: "custom",
    labelKey: "categories.custom",
    defaultLabel: "Custom",
    pillar: "productivity",
    iconName: "plus",
    accentHex: "#7C72FF",
  },
];
