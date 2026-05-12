import posthog from "posthog-js";

// ─── Event catalogue ─────────────────────────────────────────────────────────

export type EventName =
  // Onboarding
  | "onboarding_viewed"
  | "onboarding_completed"
  | "onboarding_skipped"
  | "sample_portfolio_started"
  | "sample_portfolio_loaded"
  // Portfolio X-Ray
  | "holdings_added_manual"
  | "csv_upload_started"
  | "csv_upload_completed"
  | "csv_upload_failed"
  | "screenshot_upload_started"
  | "screenshot_upload_completed"
  | "screenshot_upload_failed"
  | "portfolio_xray_generated"
  | "unknown_holdings_detected"
  // AI Coach
  | "ai_coach_opened"
  | "ai_prompt_clicked"
  | "ai_message_sent"
  | "ai_response_generated"
  | "ai_limit_reached"
  // Reports
  | "report_saved"
  | "report_deleted"
  | "report_viewed"
  | "report_compared"
  | "pdf_export_started"
  | "pdf_export_completed"
  | "pdf_export_failed"
  // Premium / upgrade
  | "upgrade_prompt_viewed"
  | "upgrade_prompt_clicked"
  | "premium_page_viewed"
  | "premium_feature_blocked"
  // Stripe / subscription
  | "checkout_started"
  | "checkout_completed"
  | "checkout_failed"
  | "subscription_activated"
  | "subscription_cancelled"
  | "customer_portal_opened";

export type EventProperties = Record<string, string | number | boolean | null | undefined>;

// ─── trackEvent ──────────────────────────────────────────────────────────────
//
// Central analytics call. Fails silently so it never crashes the app.
// In development, every event is logged to the console for easy verification.
// PostHog only fires when NEXT_PUBLIC_POSTHOG_KEY is set and the provider
// has called posthog.init() — otherwise events are silently dropped.
//
// What is intentionally NOT tracked:
//   - Raw portfolio values, prices, or market data
//   - CSV file contents or uploaded screenshots
//   - AI message text (questions or answers)
//   - Brokerage account details
//   - Session IDs or personal identifiers
//
export function trackEvent(name: EventName, properties?: EventProperties): void {
  if (typeof window === "undefined") return;

  if (process.env.NODE_ENV === "development") {
    console.log(`[analytics] ${name}`, properties ?? {});
  }

  try {
    posthog.capture(name, properties);
  } catch {
    // Never let analytics errors surface to the user
  }
}
