export const SUPABASE_CONFIG = {
  url: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  anonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
} as const;

export function isSupabaseConfigured(): boolean {
  return (
    Boolean(SUPABASE_CONFIG.url) &&
    Boolean(SUPABASE_CONFIG.anonKey) &&
    !SUPABASE_CONFIG.url.includes("YOUR_PROJECT_REF") &&
    !SUPABASE_CONFIG.anonKey.includes("YOUR_SUPABASE_")
  );
}
