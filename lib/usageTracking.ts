/**
 * Lightweight local usage counters (per browser).
 * AI Coach: resets daily (America/Toronto calendar day).
 */

import { FREE_LIMITS } from "@/lib/subscriptionFeatures";

const AI_COACH_COUNT_PREFIX = "bic_ai_coach_count_";

export function getCoachDayKey(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Toronto" });
}

export function getAiCoachMessagesToday(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(AI_COACH_COUNT_PREFIX + getCoachDayKey());
  const n = raw ? parseInt(raw, 10) : 0;
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function incrementAiCoachMessagesToday(): void {
  if (typeof window === "undefined") return;
  const key = AI_COACH_COUNT_PREFIX + getCoachDayKey();
  const next = getAiCoachMessagesToday() + 1;
  window.localStorage.setItem(key, String(next));
}

export function hasReachedFreeAiCoachLimit(): boolean {
  return getAiCoachMessagesToday() >= FREE_LIMITS.maxAiMessagesPerDay;
}
