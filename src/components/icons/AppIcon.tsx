import React from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart2,
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Compass,
  Flag,
  Heart,
  Home,
  Inbox,
  Info,
  MessageCircle,
  Moon,
  Plus,
  Repeat,
  Send,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Star,
  Sun,
  Sunrise,
  Target,
  User,
  VolumeX,
  X,
  type LucideIcon,
} from "lucide-react-native";

const ICON_MAP: Record<string, LucideIcon> = {
  activity: Activity,
  "alert-circle": AlertCircle,
  "alert-triangle": AlertTriangle,
  "bar-chart-2": BarChart2,
  bell: Bell,
  "book-open": BookOpen,
  briefcase: Briefcase,
  calendar: Calendar,
  check: Check,
  "check-circle": CheckCircle2,
  "chevron-left": ChevronLeft,
  "chevron-right": ChevronRight,
  circle: Circle,
  compass: Compass,
  cpu: Sparkles,
  flag: Flag,
  heart: Heart,
  home: Home,
  inbox: Inbox,
  info: Info,
  "message-circle": MessageCircle,
  moon: Moon,
  plus: Plus,
  repeat: Repeat,
  send: Send,
  shield: Shield,
  sliders: SlidersHorizontal,
  sparkles: Sparkles,
  star: Star,
  sun: Sun,
  sunrise: Sunrise,
  target: Target,
  user: User,
  "volume-x": VolumeX,
  x: X,
};

export type AppIconName = keyof typeof ICON_MAP;

export interface AppIconProps {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export const AppIcon: React.FC<AppIconProps> = ({
  name,
  size = 20,
  color = "#121324",
  strokeWidth = 2,
}) => {
  const IconComponent = ICON_MAP[name] ?? Circle;
  return <IconComponent size={size} color={color} strokeWidth={strokeWidth} />;
};
