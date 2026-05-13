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
    body: "CSV upload is part of Premium Portfolio Tools. You can still add holdings manually and explore the Portfolio X-Ray for free.",
    primaryCta: "Upgrade to Premium",
  },
  screenshot: {
    title: "Premium Portfolio Tools",
    body: "Screenshot import is a Premium feature. You can still enter holdings manually to get started.",
    primaryCta: "Upgrade to Premium",
  },
  holdings: {
    title: "Need more holdings?",
    body: "The free tier supports up to 10 holdings. Premium gives you room for a larger portfolio — or you can remove a holding to continue.",
    primaryCta: "Upgrade to Premium",
  },
  savedReports: {
    title: "Need more snapshots?",
    body: "Free accounts can save up to 2 portfolio reports. Premium unlocks unlimited snapshots so you can track how your portfolio changes over time.",
    primaryCta: "Upgrade to Premium",
  },
  aiCoach: {
    title: "Daily questions used up",
    body: "You’ve used today’s free questions. Premium gives you more daily questions and expanded explanations from Lantern.",
    primaryCta: "Upgrade to Premium",
  },
  pdf: {
    title: "Premium Portfolio Tools",
    body: "PDF export is a Premium feature. You can still use Print / Save as PDF from your browser at any time.",
    primaryCta: "Upgrade to Premium",
  },
  reportComparison: {
    title: "Compare your snapshots",
    body: "Comparing two saved reports is a Premium feature. Save a few snapshots over time, then compare them to see how your portfolio has shifted.",
    primaryCta: "Upgrade to Premium",
  },
};
