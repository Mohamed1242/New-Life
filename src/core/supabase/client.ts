import { Platform } from "react-native";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import type { Database } from "@/types/supabase";
import { SUPABASE_CONFIG, isSupabaseConfigured } from "./config";

const secureStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      try {
        return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
      } catch {
        return null;
      }
    }
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined") window.localStorage.setItem(key, value);
      } catch {
        // ignore web storage quota errors
      }
      return;
    }
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      try {
        if (typeof window !== "undefined") window.localStorage.removeItem(key);
      } catch {
        // ignore
      }
      return;
    }
    await SecureStore.deleteItemAsync(key);
  },
};

let clientInstance: SupabaseClient<Database> | null = null;

export function getSupabaseClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) return null;
  if (!clientInstance) {
    clientInstance = createClient<Database>(
      SUPABASE_CONFIG.url,
      SUPABASE_CONFIG.anonKey,
      {
        auth: {
          storage: secureStorageAdapter,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: Platform.OS === "web",
        },
      },
    );
  }
  return clientInstance;
}
