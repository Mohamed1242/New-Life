import {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  FadeOutUp,
  WithSpringConfig,
} from "react-native-reanimated";

export const SPRING_GENTLE: WithSpringConfig = {
  damping: 20,
  stiffness: 220,
  mass: 0.9,
};

export const SPRING_TACTILE: WithSpringConfig = {
  damping: 18,
  stiffness: 260,
};

export const TIMING_PROGRESS = {
  duration: 600,
  easing: Easing.out(Easing.cubic),
};

export const ENTER_CARD = FadeInDown.duration(260).easing(Easing.out(Easing.cubic));
export const ENTER_TOAST = FadeInUp.duration(220);
export const EXIT_TOAST = FadeOutUp.duration(180);
export const ENTER_FADE = FadeIn.duration(220);
export const EXIT_FADE = FadeOut.duration(180);
