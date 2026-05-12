"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SubscriptionTier } from "@/lib/subscriptionFeatures";
import { STORAGE_TIER_KEY } from "@/lib/subscriptionFeatures";

export interface SubscriptionContextValue {
  tier: SubscriptionTier;
  isPremium: boolean;
  setTier: (tier: SubscriptionTier) => void;
  hydrated: boolean;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [tier, setTierState] = useState<SubscriptionTier>("free");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_TIER_KEY);
      if (raw === "premium" || raw === "free") {
        setTierState(raw);
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  const setTier = useCallback((next: SubscriptionTier) => {
    setTierState(next);
    try {
      window.localStorage.setItem(STORAGE_TIER_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      tier,
      isPremium: tier === "premium",
      setTier,
      hydrated,
    }),
    [tier, setTier, hydrated]
  );

  return (
    <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>
  );
}

export function useSubscription(): SubscriptionContextValue {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }
  return ctx;
}
