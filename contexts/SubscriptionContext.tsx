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
import { trackEvent } from "@/lib/analytics";

export interface SubscriptionContextValue {
  tier: SubscriptionTier;
  isPremium: boolean;
  setTier: (tier: SubscriptionTier) => void;
  hydrated: boolean;
  loading: boolean;
  refreshSubscription: () => Promise<void>;
  openCheckout: () => Promise<void>;
  openPortal: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextValue | null>(null);

async function fetchSubscriptionStatus(sessionId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/subscription/status?session_id=${sessionId}`);
    if (!res.ok) return false;
    const { isPremium } = await res.json();
    return Boolean(isPremium);
  } catch {
    return false;
  }
}

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [tier, setTierState] = useState<SubscriptionTier>("free");
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(false);

  const applyTier = useCallback((next: SubscriptionTier) => {
    setTierState(next);
    try {
      window.localStorage.setItem(STORAGE_TIER_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  // On mount: read localStorage optimistically, then verify against server
  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Beta mode: grant premium to everyone, skip server verification
      if (process.env.NEXT_PUBLIC_BETA_MODE === "true") {
        setTierState("premium");
        setHydrated(true);
        return;
      }

      // Optimistic read from localStorage
      try {
        const raw = window.localStorage.getItem(STORAGE_TIER_KEY);
        if (raw === "premium" || raw === "free") {
          setTierState(raw);
        }
      } catch {
        /* ignore */
      }
      setHydrated(true);

      // Server verification — overrides localStorage
      const sessionId = window.localStorage.getItem("bic_session_id");
      if (!sessionId) return;

      setLoading(true);
      const isPremium = await fetchSubscriptionStatus(sessionId);
      if (!cancelled) {
        applyTier(isPremium ? "premium" : "free");
        setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [applyTier]);

  const setTier = useCallback((next: SubscriptionTier) => {
    applyTier(next);
  }, [applyTier]);

  const refreshSubscription = useCallback(async () => {
    const sessionId = window.localStorage.getItem("bic_session_id");
    if (!sessionId) return;
    setLoading(true);
    const isPremium = await fetchSubscriptionStatus(sessionId);
    applyTier(isPremium ? "premium" : "free");
    setLoading(false);
  }, [applyTier]);

  const openCheckout = useCallback(async () => {
    const sessionId = window.localStorage.getItem("bic_session_id");
    if (!sessionId) return;

    trackEvent("checkout_started");
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!res.ok) {
        trackEvent("checkout_failed");
        setLoading(false);
        return;
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        trackEvent("checkout_failed");
        setLoading(false);
      }
    } catch {
      trackEvent("checkout_failed");
      setLoading(false);
    }
  }, []);

  const openPortal = useCallback(async () => {
    const sessionId = window.localStorage.getItem("bic_session_id");
    if (!sessionId) return;

    trackEvent("customer_portal_opened");
    setLoading(true);

    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId }),
      });

      if (!res.ok) {
        setLoading(false);
        return;
      }

      const { url } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }, []);

  const value = useMemo<SubscriptionContextValue>(
    () => ({
      tier,
      isPremium: tier === "premium",
      setTier,
      hydrated,
      loading,
      refreshSubscription,
      openCheckout,
      openPortal,
    }),
    [tier, setTier, hydrated, loading, refreshSubscription, openCheckout, openPortal]
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
