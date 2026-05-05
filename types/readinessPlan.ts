// Central types for the readiness plan data model.
// Fields are optional where a user may complete the app in stages.

export type InvestorProfile =
  | "Conservative Beginner"
  | "Balanced Beginner"
  | "Growth Beginner";

export type EmergencyFundStatus =
  | "Not started"
  | "Less than 1 month"
  | "1–3 months"
  | "3–6 months"
  | "6+ months";

export type FeasibilityStatus = "covered" | "on-track" | "close" | "difficult";

export type StartingCheckType = "neutral" | "caution" | "ok";

// ---- Money inputs ----

export interface MoneySnapshot {
  monthlyTakeHomePay: number;
  monthlyBills: number;
  monthlyDebtPayments: number;
  monthlyEmergencySavingsContribution: number;
  monthlyShortTermSavingsContribution: number;
  monthlyLifestylePlayBuffer: number;
  emergencyFundStatus: EmergencyFundStatus;
  currentCashSavings: number;
  emergencyFundTarget: number;
  shortTermSavingsToProtect: number;
  startingInvestmentAmount: number;
}

// ---- Contribution guidance ----

export interface ContributionGuidanceResult {
  monthlySurplus: number;
  billsPercentage: number;
  debtPercentage: number;
  protectedSavingsTarget: number;
  cashAvailableAboveProtectedSavings: number;
  estimatedContributionMin: number;
  estimatedContributionMax: number;
  estimatedContributionMidpoint: number;
  startingInvestmentCheckMessage: string;
  startingInvestmentCheckType: StartingCheckType;
  cautionNotes: string[];
}

// ---- Goal plan ----

export interface GoalPlan {
  targetAmount: number;
  timelineYears: number;
  annualReturnAssumption: number;
  startingInvestmentAmount: number;
  affordableMonthlyContribution: number;
  requiredMonthlyContribution: number;
  monthlyGap: number;
  estimatedFutureValueUsingAffordableContribution: number;
  shortfallOrSurplus: number;
  feasibilityStatus: FeasibilityStatus;
}

// ---- Sample allocation ----

export interface SampleAllocationItem {
  roleId: string;
  roleLabel: string;
  roleDescription: string;
  selectedTicker: string;
  alternativeTickers: string[];
  allocationPercent: number;
  startingAmountAllocation: number;
  monthlyContributionAllocation: number;
  riskLevel: string;
  portfolioRole: string;
}

// ---- Projection ----

export interface ProjectionAssumptions {
  projectionYears: number;
  annualReturnAssumption: number;
  withdrawalRate: number;
}

export interface ProjectionResult {
  totalContributed: number;
  estimatedFutureValue: number;
  estimatedInvestmentGrowth: number;
  estimatedAnnualIncome: number;
  estimatedMonthlyIncome: number;
}

// ---- Composite readiness plan ----

export interface ReadinessPlan {
  schemaVersion: 1;
  investorProfile?: InvestorProfile;
  moneySnapshot?: Partial<MoneySnapshot>;
  contributionGuidance?: ContributionGuidanceResult;
  goalPlan?: GoalPlan;
  sampleAllocation?: SampleAllocationItem[];
  projectionAssumptions?: ProjectionAssumptions;
  projectionResult?: ProjectionResult;
}
