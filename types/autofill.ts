export interface AutofillExtractedFields {
  monthlyTakeHomePay: number | null;
  monthlyBills: number | null;
  monthlyDebtPayments: number | null;
  currentCashSavings: number | null;
  emergencyFundTarget: number | null;
  shortTermSavingsToProtect: number | null;
  startingInvestmentAmount: number | null;
  monthlyEmergencySavingsContribution: number | null;
  monthlyShortTermSavingsContribution: number | null;
  monthlyLifestylePlayBuffer: number | null;
  emergencyFundStatus: string | null;
  targetAmount: number | null;
  timelineYears: number | null;
  affordableMonthlyContribution: number | null;
  annualReturnAssumption: number | null;
  investorProfile: string | null;
}

export interface AutofillResearchNeeded {
  needed: boolean;
  reason: string | null;
  suggestedResearchQuestion: string | null;
}

export interface AutofillResult {
  status: "ready_to_apply" | "needs_clarification" | "needs_research" | "unsupported";
  confidence: number;
  extractedFields: AutofillExtractedFields;
  clarifyingQuestions: string[];
  assumptions: string[];
  researchNeeded: AutofillResearchNeeded;
  summary: string;
}
