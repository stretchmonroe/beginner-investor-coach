"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

const STORAGE_SESSION_KEY = "bic_session_id";

interface AuthContextValue {
  user: User | null;
  authLoading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  authLoading: true,
  signInWithMagicLink: async () => ({}),
  signOut: async () => {},
});

async function migrateAnonymousData(sessionId: string, userId: string): Promise<void> {
  await Promise.all([
    supabase
      .from("anonymous_portfolio_reports")
      .update({ user_id: userId })
      .eq("anonymous_session_id", sessionId)
      .is("user_id", null),
    supabase
      .from("anonymous_coach_conversations")
      .update({ user_id: userId })
      .eq("anonymous_session_id", sessionId)
      .is("user_id", null),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);
      setAuthLoading(false);

      if (event === "SIGNED_IN" && nextUser) {
        try {
          const sessionId = localStorage.getItem(STORAGE_SESSION_KEY);
          if (sessionId) migrateAnonymousData(sessionId, nextUser.id);
        } catch {
          // localStorage not available (SSR guard)
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signInWithMagicLink(email: string): Promise<{ error?: string }> {
    const redirectTo =
      typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    return error ? { error: error.message } : {};
  }

  async function signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, authLoading, signInWithMagicLink, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
