/**
 * Central feature gating for Free vs Premium Portfolio Tools.
 * No billing — tier is stored locally for now (see SubscriptionContext).
 */

export type SubscriptionTier = "free" | "premium";

export const STORAGE_TIER_KEY = "bic_subscription_tier";

/** Numeric limits for the free tier */
export const FREE_LIMITS = {
  maxHoldings: 10,
  maxSavedReports: 2,
  maxAiMessagesPerDay: 5,
} as const;

/** Premium-only capabilities (documentation + helpers) */
export const PREMIUM_FEATURES = {
  csvUpload: true,
  screenshotImport: true,
  unlimitedHoldings: true,
  unlimitedSavedReports: true,
  pdfExport: true,
  advancedOverlapInsights: true,
  reportComparison: true,
  expandedAiExplanations: true,
  /** Reserved for future queue / faster enrichment */
  priorityMetadataEnrichment: true,
} as const;

export function isPremiumTier(tier: SubscriptionTier): boolean {
  return tier === "premium";
}

export function canUseCsvUpload(tier: SubscriptionTier): boolean {
  return isPremiumTier(tier);
}

export function canUseScreenshotImport(tier: SubscriptionTier): boolean {
  return isPremiumTier(tier);
}

export function canDownloadPortfolioPdf(tier: SubscriptionTier): boolean {
  return isPremiumTier(tier);
}

export function canUseReportComparison(tier: SubscriptionTier): boolean {
  return isPremiumTier(tier);
}

export function maxHoldingsForTier(tier: SubscriptionTier): number {
  return isPremiumTier(tier) ? Number.POSITIVE_INFINITY : FREE_LIMITS.maxHoldings;
}

export function maxSavedReportsForTier(tier: SubscriptionTier): number {
  return isPremiumTier(tier) ? Number.POSITIVE_INFINITY : FREE_LIMITS.maxSavedReports;
}

export function canAddMoreHoldings(tier: SubscriptionTier, currentCount: number): boolean {
  return currentCount < maxHoldingsForTier(tier);
}

export function canSaveAnotherReport(
  tier: SubscriptionTier,
  existingSavedReportCount: number
): boolean {
  return existingSavedReportCount < maxSavedReportsForTier(tier);
}

export function showAdvancedOverlapInsights(tier: SubscriptionTier): boolean {
  return isPremiumTier(tier);
}

export type UpgradeMoment =
  | "csv"
  | "screenshot"
  | "holdings"
  | "savedReports"
  | "aiCoach"
  | "pdf"
  | "reportComparison";

export const UPGRADE_COPY: Record<
  UpgradeMoment,
  { title: string; body: string; primaryCta: string }
> = {
  csv: {
    title: "Premium Portfolio Tools",
    body: "CSV upload is part of Premium Portfolio Tools. You can still add holdings manually and use the Portfolio X-Ray on the free tier.",
    primaryCta: "View Premium tools",
  },
  screenshot: {
    title: "Premium Portfolio Tools",
    body: "Screenshot import is available with Premium. You can still enter holdings manually or use a CSV on Premium.",
    primaryCta: "View Premium tools",
  },
  holdings: {
    title: "Free tier limit",
    body: "You’ve reached the free holdings limit for Portfolio X-Ray. Premium includes room for a larger portfolio list, or remove a holding to stay within the free tier.",
    primaryCta: "View Premium tools",
  },
  savedReports: {
    title: "Free tier limit",
    body: "You’ve reached the free saved report limit. Premium includes unlimited saved Portfolio Reports so you can track snapshots over time.",
    primaryCta: "View Premium tools",
  },
  aiCoach: {
    title: "Free tier limit",
    body: "You’ve reached today’s free AI Coach limit. Premium includes expanded AI explanations for your portfolio questions.",
    primaryCta: "View Premium tools",
  },
  pdf: {
    title: "Premium Portfolio Tools",
    body: "PDF export is available with Premium. You can still use Print / Save as PDF from your browser on the free tier.",
    primaryCta: "View Premium tools",
  },
  reportComparison: {
    title: "Advanced Portfolio Insights",
    body: "Portfolio Report comparison is part of Premium Portfolio Tools. Save another snapshot when you’re ready, and compare changes over time with Premium.",
    primaryCta: "View Premium tools",
  },
};
