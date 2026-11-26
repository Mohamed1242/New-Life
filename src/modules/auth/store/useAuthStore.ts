import type { Session, User } from "@supabase/supabase-js";
import { create } from "zustand";
import { getSupabaseClient } from "@/core/supabase/client";
import { isSupabaseConfigured } from "@/core/supabase/config";
import { syncEngine } from "@/core/sync/syncEngine";
import { syncQueueDb, type SyncMetadata } from "@/core/sync/syncQueue";
import { useCompanionStore } from "@/store/useCompanionStore";

function syncUserNameFromAuth(user: User | null) {
  const metaName =
    typeof user?.user_metadata?.display_name === "string"
      ? user.user_metadata.display_name.trim()
      : "";
  if (metaName) {
    useCompanionStore.getState().setDisplayName(metaName).catch(() => {});
  }
}

interface AuthState {
  isConfigured: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  pendingSyncCount: number;
  syncMetadata: SyncMetadata;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  triggerSync: () => Promise<void>;
  refreshSyncStats: () => Promise<void>;
}

let listenerRegistered = false;

export const useAuthStore = create<AuthState>((set, get) => ({
  isConfigured: isSupabaseConfigured(),
  isLoading: false,
  user: null,
  session: null,
  pendingSyncCount: 0,
  syncMetadata: {
    lastPulledAt: null,
    lastPushedAt: null,
    lastSyncStatus: "idle",
    lastSyncError: null,
  },

  refreshSyncStats: async () => {
    const [pendingSyncCount, syncMetadata] = await Promise.all([
      syncQueueDb.countPending(),
      syncQueueDb.getMetadata(),
    ]);
    set({ pendingSyncCount, syncMetadata });
  },

  initialize: async () => {
    await get().refreshSyncStats();
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data } = await supabase.auth.getSession();
    set({
      session: data.session,
      user: data.session?.user ?? null,
    });
    syncUserNameFromAuth(data.session?.user ?? null);

    if (!listenerRegistered) {
      listenerRegistered = true;
      supabase.auth.onAuthStateChange((_event, nextSession) => {
        const curr = get();
        const nextUser = nextSession?.user ?? null;
        if (
          curr.user?.id === nextUser?.id &&
          curr.session?.access_token === nextSession?.access_token
        ) {
          return;
        }
        set({
          session: nextSession,
          user: nextUser,
        });
        syncUserNameFromAuth(nextUser);
      });
    }
  },

  signIn: async (email, password) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase environment keys are not configured.");
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      set({ session: data.session, user: data.user });
      syncUserNameFromAuth(data.user);
      await syncEngine.runSync({ force: true });
      await get().refreshSyncStats();
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, displayName) => {
    const supabase = getSupabaseClient();
    if (!supabase) throw new Error("Supabase environment keys are not configured.");
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { display_name: displayName.trim() || "Friend" },
        },
      });
      if (error) throw error;
      set({ session: data.session, user: data.user });
      syncUserNameFromAuth(data.user);
      if (data.session) {
        await syncEngine.runSync();
      }
      await get().refreshSyncStats();
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    const supabase = getSupabaseClient();
    if (!supabase) return;
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      set({ session: null, user: null });
    } finally {
      set({ isLoading: false });
    }
  },

  triggerSync: async () => {
    set({ isLoading: true });
    try {
      await syncEngine.runSync({ force: true });
      await get().refreshSyncStats();
    } finally {
      set({ isLoading: false });
    }
  },
}));
