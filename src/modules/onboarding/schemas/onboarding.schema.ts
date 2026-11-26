import { z } from "zod";

export const onboardingSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Please share a name or nickname")
    .max(40, "Keep your name under 40 characters"),
  selectedGoals: z.array(z.string()).min(1, "Pick at least one focus goal"),
  coachingTone: z.enum(["gentle", "direct"]),
});

export type OnboardingFormValues = z.infer<typeof onboardingSchema>;
