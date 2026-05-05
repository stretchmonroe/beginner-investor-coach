// Pure calculation helpers for the readiness plan.
// These are intentionally side-effect-free so they can be tested and reused across components.

import type {
  InvestorProfile,
  EmergencyFundStatus,
  FeasibilityStatus,
  StartingCheckType,
} from "@/types/readinessPlan";
import { roundToNearest25 } from "./formatters";

// ---- Timeline type (mirrors OnboardingQuiz answers) ----

export type InvestingTimeline = "Less than 3 years" | "3–10 years" | "10+ years";

// ---- Profile defaults ----

/** Return the default assumed annual return % for an investor profile. */
export function getDefaultReturnForProfile(profile: InvestorProfile): number {
  if (profile === "Growth Beginner") return 8;
  if (profile === "Balanced Beginner") return 6;
  return 4;
}

/** Return the default projection horizon in years for a quiz timeline answer. */
export function getDefaultProjectionYearsForTimeline(timeline: InvestingTimeline): number {
  if (timeline === "10+ years") return 20;
  if (timeline === "3–10 years") return 10;
  return 3;
}

// ---- Core future value formula ----

/**
 * Standard future value of a lump sum plus regular monthly contributions,
 * compounded monthly at the given annual return rate.
 */
export function calculateFutureValue(
  starting: number,
  monthly: number,
  years: number,
  annualReturnPct: number
): number {
  const months = Math.round(years * 12);
  if (annualReturnPct === 0 || months === 0) return starting + monthly * months;
  const r = annualReturnPct / 100 / 12;
  return (
    starting * Math.pow(1 + r, months) +
    monthly * ((Math.pow(1 + r, months) - 1) / r)
  );
}

// ---- Projection results ----

export interface ProjectionResults {
  futureValue: number;
  totalContributed: number;
  estimatedGrowth: number;
  estimatedAnnualIncome: number;
  estimatedMonthlyIncome: number;
}

/** Compute the full set of projection results from simulation inputs. */
export function calculateProjectionResults(
  starting: number,
  monthly: number,
  years: number,
  annualReturnPct: number,
  withdrawalRatePct: number
): ProjectionResults {
  const months = Math.round(years * 12);
  const futureValue = calculateFutureValue(starting, monthly, years, annualReturnPct);
  const totalContributed = starting + monthly * months;
  const estimatedGrowth = futureValue - totalContributed;
  const estimatedAnnualIncome = futureValue * (withdrawalRatePct / 100);
  const estimatedMonthlyIncome = estimatedAnnualIncome / 12;
  return {
    futureValue,
    totalContributed,
    estimatedGrowth,
    estimatedAnnualIncome,
    estimatedMonthlyIncome,
  };
}

// ---- Milestone detection ----

/**
 * Binary-search the year (rounded up) at which the portfolio first reaches `target`.
 * Returns null if the target is not reached within the given timeline.
 */
export function findMilestoneYear(
  starting: number,
  monthly: number,
  years: number,
  annualReturnPct: number,
  target: number
): number | null {
  if (calculateFutureValue(starting, monthly, years, annualReturnPct) < target) return null;
  if (calculateFutureValue(starting, monthly, 0, annualReturnPct) >= target) return 0;
  let lo = 0;
  let hi = years;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (calculateFutureValue(starting, monthly, mid, annualReturnPct) >= target) hi = mid;
    else lo = mid;
  }
  return Math.ceil(hi);
}

// ---- Goal planning ----

/**
 * Back-calculate the monthly contribution required to reach `target`
 * given a starting amount, timeline, and assumed annual return.
 */
export function calculateRequiredMonthlyContribution(
  target: number,
  starting: number,
  years: number,
  annualReturnPct: number
): number {
  const months = Math.round(years * 12);
  if (months === 0) return 0;
  const r = annualReturnPct / 100 / 12;
  const fvStarting =
    annualReturnPct === 0 ? starting : starting * Math.pow(1 + r, months);
  const remaining = target - fvStarting;
  if (remaining <= 0) return 0;
  if (annualReturnPct === 0) return remaining / months;
  return (remaining * r) / (Math.pow(1 + r, months) - 1);
}

/** Classify goal feasibility from required vs affordable monthly contribution. */
export function calculateGoalFeasibility(
  requiredMonthly: number,
  affordableMonthly: number
): FeasibilityStatus {
  if (requiredMonthly <= 0) return "covered";
  if (affordableMonthly >= requiredMonthly) return "on-track";
  const gap = requiredMonthly - affordableMonthly;
  if (gap <= 0.25 * requiredMonthly) return "close";
  return "difficult";
}

// ---- Monthly surplus ----

/** Compute investable monthly surplus after all committed outflows. */
export function calculateMonthlySurplus(
  takeHome: number,
  bills: number,
  debt: number,
  emergencySavingsContribution: number,
  shortTermSavingsContribution: number,
  lifestyleBuffer: number
): number {
  return Math.max(
    0,
    takeHome - bills - debt - emergencySavingsContribution - shortTermSavingsContribution - lifestyleBuffer
  );
}

// ---- Protected savings ----

/** Sum of emergency fund target and short-term savings to protect. */
export function calculateProtectedSavingsTarget(
  emergencyFundTarget: number,
  shortTermSavingsToProtect: number
): number {
  return emergencyFundTarget + shortTermSavingsToProtect;
}

/** Cash remaining above the protected savings target (can be negative). */
export function calculateCashAvailableAboveProtectedSavings(
  currentCashSavings: number,
  protectedSavingsTarget: number
): number {
  return currentCashSavings - protectedSavingsTarget;
}

// ---- Contribution range ----

export interface ContributionRangeResult {
  low: number;
  high: number;
  notes: string[];
}

/**
 * Estimate a monthly contribution range (low–high) as a percentage of surplus,
 * adjusted for profile, emergency fund status, bills burden, and debt burden.
 */
export function calculateContributionRange(
  surplus: number,
  profile: InvestorProfile,
  emergencyStatus: EmergencyFundStatus,
  billsPct: number,
  debtPct: number
): ContributionRangeResult {
  if (surplus <= 0) return { low: 0, high: 0, notes: [] };

  const notes: string[] = [];
  let lowPct: number;
  let highPct: number;

  if (emergencyStatus === "Not started" || emergencyStatus === "Less than 1 month") {
    lowPct = 0;
    highPct = 10;
    notes.push(
      "Before investing aggressively, many beginners focus on building an emergency fund first."
    );
  } else if (emergencyStatus === "1–3 months") {
    if (profile === "Conservative Beginner") { lowPct = 5; highPct = 15; }
    else if (profile === "Balanced Beginner") { lowPct = 10; highPct = 25; }
    else { lowPct = 15; highPct = 30; }
  } else {
    if (profile === "Conservative Beginner") { lowPct = 10; highPct = 25; }
    else if (profile === "Balanced Beginner") { lowPct = 25; highPct = 40; }
    else { lowPct = 40; highPct = 60; }
  }

  if (billsPct > 70) {
    highPct = highPct / 2;
    notes.push(
      "Your bills take up a large portion of take-home pay. This may limit how much is comfortable to invest each month."
    );
  }

  if (debtPct > 20) {
    highPct = highPct / 2;
    notes.push(
      "Your debt payments are a significant portion of income. Reducing high-interest debt first may improve long-term outcomes."
    );
  }

  const low = Math.max(0, roundToNearest25((surplus * lowPct) / 100));
  const high = Math.max(0, roundToNearest25((surplus * highPct) / 100));
  return { low, high, notes };
}

// ---- Starting investment check ----

export interface StartingInvestmentCheck {
  message: string;
  type: StartingCheckType;
}

/**
 * Check whether a proposed starting investment amount is safe relative to
 * the cash available above the protected savings target.
 */
export function calculateStartingInvestmentCheck(
  startingInvestmentAmount: number,
  cashAvailableAboveProtected: number,
  hasBucketInputs: boolean
): StartingInvestmentCheck {
  if (startingInvestmentAmount <= 0 || !hasBucketInputs) {
    return { message: "No starting investment amount entered yet.", type: "neutral" };
  }
  if (cashAvailableAboveProtected <= 0) {
    return {
      message:
        "Based on the numbers entered, your current savings may still be needed for emergency or short-term goals.",
      type: "caution",
    };
  }
  if (startingInvestmentAmount > cashAvailableAboveProtected) {
    return {
      message:
        "Your starting investment amount may dip into money marked for emergency savings or short-term goals.",
      type: "caution",
    };
  }
  return {
    message:
      "Your starting investment amount appears to fit within the cash available above your protected savings target.",
    type: "ok",
  };
}
