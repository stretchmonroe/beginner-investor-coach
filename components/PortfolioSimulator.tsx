"use client";

import { useState } from "react";
import { ETFs, riskBadge, deriveProfile } from "@/lib/etfs";
import type { QuizAnswers } from "./OnboardingQuiz";
import type { Profile } from "@/lib/etfs";
import type { GoalPlan } from "@/types/readinessPlan";
import type { SharedPlanInputs } from "@/types/sharedPlanInputs";
import CoachExplanation from "./CoachExplanation";
import { profileSimulatorExplanations } from "@/lib/coachExplanations";
import type { ContributionGuidanceSnapshot } from "@/lib/learningPlans";
import { saveReadinessPlan } from "@/lib/readinessPlans";
import type {
  MoneySnapshot,
  ContributionGuidanceResult,
  SampleAllocationItem,
  ProjectionResult,
  EmergencyFundStatus,
} from "@/types/readinessPlan";
import ProjectionChart from "./ProjectionChart";
import ScenarioComparisonChart from "./ScenarioComparisonChart";
import ProjectionMilestones from "./ProjectionMilestones";
import {
  calculateProjectionResults,
  getDefaultReturnForProfile,
  getDefaultProjectionYearsForTimeline,
  type InvestingTimeline,
} from "@/lib/readinessCalculations";
import { formatCurrency, clampInput } from "@/lib/formatters";
import PageLayout from "@/components/ui/PageLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import Disclaimer from "@/components/ui/Disclaimer";

interface AllocationRole {
  role_id: string;
  role_label: string;
  allocation_percent: number;
  default_ticker: string;
  alternative_tickers: string[];
  role_description: string;
}

const allocationModels: Record<Profile, AllocationRole[]> = {
  "Conservative Beginner": [
    {
      role_id: "balanced_stability",
      role_label: "Balanced stability and growth",
      allocation_percent: 50,
      default_ticker: "VBAL",
      alternative_tickers: [],
      role_description: "Balanced ETF with a mix of stocks and bonds, emphasizing stability.",
    },
    {
      role_id: "cash_stability",
      role_label: "Cash / short-term stability",
      allocation_percent: 30,
      default_ticker: "CASH",
      alternative_tickers: [],
      role_description: "Lower-risk cash-like ETF for short-term stability.",
    },
    {
      role_id: "balanced_growth",
      role_label: "Growth with some stability",
      allocation_percent: 20,
      default_ticker: "VGRO",
      alternative_tickers: [],
      role_description: "Growth-oriented ETF with some bond exposure.",
    },
  ],
  "Balanced Beginner": [
    {
      role_id: "balanced_growth",
      role_label: "Growth with some stability",
      allocation_percent: 50,
      default_ticker: "VGRO",
      alternative_tickers: [],
      role_description: "Growth-oriented ETF with some bond exposure.",
    },
    {
      role_id: "balanced_stability",
      role_label: "Balanced stability and growth",
      allocation_percent: 30,
      default_ticker: "VBAL",
      alternative_tickers: [],
      role_description: "Balanced ETF with a mix of stocks and bonds.",
    },
    {
      role_id: "core_growth",
      role_label: "Core long-term growth",
      allocation_percent: 20,
      default_ticker: "XEQT",
      alternative_tickers: ["VEQT"],
      role_description: "Broad all-equity ETF for long-term growth.",
    },
  ],
  "Growth Beginner": [
    {
      role_id: "core_growth",
      role_label: "Core long-term growth",
      allocation_percent: 60,
      default_ticker: "XEQT",
      alternative_tickers: ["VEQT"],
      role_description: "Broad all-equity ETF exposure for long-term growth.",
    },
    {
      role_id: "balanced_growth",
      role_label: "Growth with some stability",
      allocation_percent: 30,
      default_ticker: "VGRO",
      alternative_tickers: [],
      role_description: "Growth-oriented ETF with some bond exposure.",
    },
    {
      role_id: "cash_stability",
      role_label: "Cash / short-term stability",
      allocation_percent: 10,
      default_ticker: "CASH",
      alternative_tickers: [],
      role_description: "Lower-risk cash-like ETF for short-term stability.",
    },
  ],
};

const profileExplanation: Record<Profile, string> = {
  "Conservative Beginner":
    "This sample allocation focuses more on stability and lower volatility. It may be easier for a cautious beginner to hold through market swings, but it may have lower long-term growth potential.",
  "Balanced Beginner":
    "This sample allocation balances growth and stability. It keeps most of the portfolio invested for growth while including more moderate options to reduce volatility.",
  "Growth Beginner":
    "This sample allocation leans toward long-term growth. It may have higher upside over long periods, but it can also drop meaningfully during market downturns.",
};

const profileProjectionNote: Record<Profile, string> = {
  "Conservative Beginner":
    "This scenario uses lower return assumptions because cautious portfolios usually prioritize stability over maximum growth.",
  "Balanced Beginner":
    "This scenario uses a moderate return assumption to show a balance between long-term growth and risk.",
  "Growth Beginner":
    "This scenario uses a higher return assumption, but higher expected growth usually comes with larger temporary declines.",
};

const timelineWarning: Record<InvestingTimeline, string> = {
  "Less than 3 years":
    "For short timelines, stock-heavy ETFs may be too volatile. Money needed soon is usually better kept in lower-risk options.",
  "3–10 years":
    "This is a medium timeline. Balance growth with the risk that markets may be down when you need the money.",
  "10+ years":
    "A longer timeline can make growth-oriented ETFs easier to hold, but you should still be prepared for significant declines along the way.",
};

const timelineWarnStyle: Record<InvestingTimeline, string> = {
  "Less than 3 years": "bg-red-50 border-red-200 text-red-700",
  "3–10 years": "bg-amber-50 border-amber-200 text-amber-700",
  "10+ years": "bg-teal-50 border-teal-200 text-teal-700",
};

const feasibilityColors: Record<string, { text: string }> = {
  covered:    { text: "text-blue-700" },
  "on-track": { text: "text-teal-700" },
  close:      { text: "text-amber-700" },
  difficult:  { text: "text-rose-700" },
};

const feasibilityLabels: Record<string, string> = {
  covered:    "Target already covered",
  "on-track": "On track based on assumptions",
  close:      "Close, may need adjustment",
  difficult:  "Likely difficult at current contribution",
};

const PROFILES: Profile[] = ["Conservative Beginner", "Balanced Beginner", "Growth Beginner"];
const TIMELINES: InvestingTimeline[] = ["Less than 3 years", "3–10 years", "10+ years"];

interface Props {
  answers: QuizAnswers | null;
  onBack: () => void;
  prefillMonthly?: number | null;
  prefillStarting?: number | null;
  onContributionGuidance: () => void;
  onGoalPlanner: (starting: number, monthly: number) => void;
  onAssetClassExplorer?: () => void;
  onAskCoach?: (question: string) => void;
  sessionId: string;
  guidanceSnapshot?: ContributionGuidanceSnapshot | null;
  goalPlan?: GoalPlan | null;
  sharedPlanInputs?: SharedPlanInputs;
  onSharedInputsChange?: (updates: Partial<SharedPlanInputs>) => void;
}

export default function PortfolioSimulator({
  answers,
  onBack,
  prefillMonthly,
  prefillStarting,
  onContributionGuidance,
  onGoalPlanner,
  onAssetClassExplorer,
  onAskCoach,
  sessionId,
  guidanceSnapshot,
  goalPlan,
  sharedPlanInputs,
  onSharedInputsChange,
}: Props) {
  const derivedProfile = deriveProfile(answers);
  const initialProfile = derivedProfile ?? (sharedPlanInputs?.investorProfile as Profile | undefined) ?? "Balanced Beginner";
  const initialTimeline = (sharedPlanInputs?.timeline as InvestingTimeline | undefined)
    ?? (answers?.timeline as InvestingTimeline)
    ?? "10+ years";

  const [startingAmount, setStartingAmount] = useState(
    prefillStarting != null ? String(prefillStarting)
    : sharedPlanInputs?.startingInvestmentAmount != null ? String(sharedPlanInputs.startingInvestmentAmount)
    : "0"
  );
  const [monthlyContribution, setMonthlyContribution] = useState(
    prefillMonthly != null ? String(prefillMonthly)
    : sharedPlanInputs?.monthlyContribution != null ? String(sharedPlanInputs.monthlyContribution)
    : "500"
  );
  const [timeline, setTimeline] = useState<InvestingTimeline>(initialTimeline);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [showCoach, setShowCoach] = useState(false);

  const [projectionYears, setProjectionYears] = useState(
    sharedPlanInputs?.projectionYears != null
      ? String(sharedPlanInputs.projectionYears)
      : String(getDefaultProjectionYearsForTimeline(initialTimeline))
  );
  const [annualReturn, setAnnualReturn] = useState(
    sharedPlanInputs?.annualReturnAssumption != null
      ? String(sharedPlanInputs.annualReturnAssumption)
      : String(getDefaultReturnForProfile(initialProfile))
  );
  const [withdrawalRate, setWithdrawalRate] = useState(
    sharedPlanInputs?.withdrawalRate != null ? String(sharedPlanInputs.withdrawalRate) : "4"
  );

  // Track which inputs were pre-filled from shared state (not explicit props)
  const [startingFromShared] = useState(prefillStarting == null && sharedPlanInputs?.startingInvestmentAmount != null);
  const [monthlyFromShared] = useState(prefillMonthly == null && sharedPlanInputs?.monthlyContribution != null);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [swappedTickers, setSwappedTickers] = useState<Record<string, string>>({});

  const starting = clampInput(startingAmount);
  const monthly = clampInput(monthlyContribution);

  const items = allocationModels[profile].map((role) => ({
    ...role,
    selected_ticker: swappedTickers[role.role_id] ?? role.default_ticker,
  }));

  function swapTicker(role_id: string, ticker: string) {
    setSwappedTickers((prev) => ({ ...prev, [role_id]: ticker }));
  }

  const projYears = Math.min(Math.max(clampInput(projectionYears), 1), 50);
  const annReturn = Math.min(Math.max(clampInput(annualReturn), 0), 30);
  const wRate = Math.min(Math.max(clampInput(withdrawalRate), 0), 20);

  const projection = calculateProjectionResults(starting, monthly, projYears, annReturn, wRate);

  const displayedGuidance = guidanceSnapshot ?? null;

  async function handleSave() {
    if (!sessionId) return;
    setSaveStatus("saving");

    const sampleAllocation: SampleAllocationItem[] = items.map((item) => {
      const etf = ETFs.find((e) => e.ticker === item.selected_ticker);
      return {
        roleId: item.role_id,
        roleLabel: item.role_label,
        roleDescription: item.role_description,
        selectedTicker: item.selected_ticker,
        alternativeTickers: item.alternative_tickers,
        allocationPercent: item.allocation_percent,
        startingAmountAllocation: starting > 0 ? Math.round(starting * item.allocation_percent) / 100 : 0,
        monthlyContributionAllocation: monthly > 0 ? Math.round(monthly * item.allocation_percent) / 100 : 0,
        riskLevel: etf?.riskLevel ?? "",
        portfolioRole: item.role_label,
      };
    });

    let moneySnapshot: MoneySnapshot | null = null;
    let contributionGuidance: ContributionGuidanceResult | null = null;
    if (displayedGuidance) {
      moneySnapshot = {
        monthlyTakeHomePay: displayedGuidance.monthly_take_home_pay,
        monthlyBills: displayedGuidance.monthly_bills,
        monthlyDebtPayments: displayedGuidance.monthly_debt_payments,
        monthlyEmergencySavingsContribution: displayedGuidance.monthly_emergency_savings_contribution,
        monthlyShortTermSavingsContribution: displayedGuidance.monthly_short_term_savings_contribution,
        monthlyLifestylePlayBuffer: displayedGuidance.monthly_lifestyle_play_buffer,
        emergencyFundStatus: displayedGuidance.emergency_fund_status as EmergencyFundStatus,
        currentCashSavings: displayedGuidance.current_cash_savings,
        emergencyFundTarget: displayedGuidance.emergency_fund_target,
        shortTermSavingsToProtect: displayedGuidance.short_term_savings_to_protect,
        startingInvestmentAmount: displayedGuidance.starting_investment_amount,
      };
      contributionGuidance = {
        monthlySurplus: displayedGuidance.monthly_surplus,
        billsPercentage: displayedGuidance.bills_percentage,
        debtPercentage: displayedGuidance.debt_percentage,
        protectedSavingsTarget: displayedGuidance.protected_savings_target,
        cashAvailableAboveProtectedSavings: displayedGuidance.cash_available_above_protected_savings,
        estimatedContributionMin: displayedGuidance.estimated_contribution_min,
        estimatedContributionMax: displayedGuidance.estimated_contribution_max,
        estimatedContributionMidpoint: displayedGuidance.estimated_contribution_midpoint,
        startingInvestmentCheckMessage: displayedGuidance.starting_investment_check_message,
        startingInvestmentCheckType: "neutral",
        cautionNotes: displayedGuidance.caution_notes,
      };
    }

    const projectionResult: ProjectionResult = {
      totalContributed: projection.totalContributed,
      estimatedFutureValue: projection.futureValue,
      estimatedInvestmentGrowth: Math.max(0, projection.estimatedGrowth),
      estimatedAnnualIncome: projection.estimatedAnnualIncome,
      estimatedMonthlyIncome: projection.estimatedMonthlyIncome,
    };

    try {
      await saveReadinessPlan({
        anonymous_session_id: sessionId,
        investor_profile: profile,
        shared_inputs_json: sharedPlanInputs ?? null,
        money_snapshot_json: moneySnapshot,
        contribution_guidance_json: contributionGuidance,
        goal_plan_json: goalPlan ?? null,
        sample_allocation_json: sampleAllocation,
        projection_assumptions_json: {
          projectionYears: projYears,
          annualReturnAssumption: annReturn,
          withdrawalRate: wRate,
          startingAmount: starting,
          monthlyContribution: monthly,
          timeline,
        },
        projection_result_json: projectionResult,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  }

  return (
    <PageLayout maxWidth="md">
      <PageHeader
        title="Sample Learning Allocation"
        description="See how a sample portfolio could be divided across beginner-friendly ETFs. This is an educational exercise, not a recommendation to buy."
        action={
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
        }
      />

      {/* A. Inputs */}
      <div className="mb-5">
        <SectionHeader title="A. Your inputs" />
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Starting amount */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-slate-700">Starting amount</p>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">$</span>
                <input
                  type="number"
                  min="0"
                  value={startingAmount}
                  onChange={(e) => {
                    setStartingAmount(e.target.value);
                    onSharedInputsChange?.({ startingInvestmentAmount: clampInput(e.target.value) });
                  }}
                  placeholder="0"
                  className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {prefillStarting != null && (
                <p className="text-xs text-blue-600">Pre-filled from Money Snapshot</p>
              )}
              {startingFromShared && (
                <p className="text-xs text-blue-600">Pre-filled from your previous step</p>
              )}
            </div>

            {/* Monthly contribution */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">Monthly contribution</p>
                <button
                  onClick={onContributionGuidance}
                  className="text-xs text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  Help me estimate →
                </button>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">$</span>
                <input
                  type="number"
                  min="0"
                  value={monthlyContribution}
                  onChange={(e) => {
                    setMonthlyContribution(e.target.value);
                    onSharedInputsChange?.({ monthlyContribution: clampInput(e.target.value) });
                  }}
                  placeholder="500"
                  className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              {prefillMonthly != null && (
                <p className="text-xs text-blue-600">Pre-filled from Money Snapshot</p>
              )}
              {monthlyFromShared && (
                <p className="text-xs text-blue-600">Pre-filled from your previous step</p>
              )}
            </div>

            {/* Timeline */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-slate-700">Timeline</p>
              <select
                value={timeline}
                onChange={(e) => {
                  const t = e.target.value as InvestingTimeline;
                  setTimeline(t);
                  onSharedInputsChange?.({ timeline: t });
                }}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              >
                {TIMELINES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Profile */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-slate-700">
                Investor profile
                {derivedProfile && (
                  <span className="ml-2 text-xs font-normal text-blue-600">(from your quiz)</span>
                )}
              </p>
              <select
                value={profile}
                onChange={(e) => {
                  setProfile(e.target.value as Profile);
                  setShowCoach(false);
                  setSwappedTickers({});
                  onSharedInputsChange?.({ investorProfile: e.target.value });
                }}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              >
                {PROFILES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      </div>

      {/* Money Snapshot summary */}
      {displayedGuidance && (
        <div className="mb-5">
          <SectionHeader title="Money Snapshot Summary" />
          <Card variant="highlighted">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-slate-500">Monthly surplus</p>
                <p className="font-semibold text-slate-700">{formatCurrency(displayedGuidance.monthly_surplus)}</p>
              </div>
              <div>
                <p className="text-slate-500">Estimated range</p>
                <p className="font-semibold text-blue-700">
                  {formatCurrency(displayedGuidance.estimated_contribution_min)} – {formatCurrency(displayedGuidance.estimated_contribution_max)}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Suggested midpoint</p>
                <p className="font-semibold text-slate-700">{formatCurrency(displayedGuidance.estimated_contribution_midpoint)}</p>
              </div>
              <div>
                <p className="text-slate-500">Emergency fund</p>
                <p className="font-semibold text-slate-700">{displayedGuidance.emergency_fund_status}</p>
              </div>
              <div>
                <p className="text-slate-500">Bills % of income</p>
                <p className="font-semibold text-slate-700">{displayedGuidance.bills_percentage.toFixed(0)}%</p>
              </div>
              <div>
                <p className="text-slate-500">Debt % of income</p>
                <p className="font-semibold text-slate-700">{displayedGuidance.debt_percentage.toFixed(0)}%</p>
              </div>
            </div>
            {displayedGuidance.caution_notes.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {displayedGuidance.caution_notes.map((note, i) => (
                  <div key={i} className="flex gap-2 items-start text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Goal Feasibility context */}
      {goalPlan && (
        <div className="mb-5">
          <SectionHeader title="Goal Feasibility Context" />
          <Card variant="highlighted">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-slate-500">Target portfolio value</p>
                <p className="font-semibold text-slate-700">{formatCurrency(goalPlan.targetAmount)}</p>
              </div>
              <div>
                <p className="text-slate-500">Timeline</p>
                <p className="font-semibold text-slate-700">{goalPlan.timelineYears} years</p>
              </div>
              <div>
                <p className="text-slate-500">Required monthly</p>
                <p className="font-semibold text-slate-700">{formatCurrency(goalPlan.requiredMonthlyContribution)}/mo</p>
              </div>
              <div>
                <p className="text-slate-500">Affordable monthly</p>
                <p className="font-semibold text-slate-700">{formatCurrency(goalPlan.affordableMonthlyContribution)}/mo</p>
              </div>
              <div>
                <p className="text-slate-500">Est. value at affordable</p>
                <p className="font-semibold text-slate-700">{formatCurrency(goalPlan.estimatedFutureValueUsingAffordableContribution)}</p>
              </div>
              <div>
                <p className="text-slate-500">Feasibility</p>
                <p className={`font-semibold ${(feasibilityColors[goalPlan.feasibilityStatus] ?? feasibilityColors["on-track"]).text}`}>
                  {feasibilityLabels[goalPlan.feasibilityStatus] ?? goalPlan.feasibilityStatus}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Timeline notice */}
      <div className={`rounded-xl border px-5 py-3.5 mb-6 text-sm leading-relaxed ${timelineWarnStyle[timeline]}`}>
        {timelineWarning[timeline]}
      </div>

      {/* Allocation section */}
      <div className="mb-6">
        <SectionHeader
          title={`Sample learning allocation — ${profile}`}
          description="These are sample ETF examples for each portfolio role. Some ETFs can serve a similar purpose, so you may see alternative examples where there is meaningful overlap."
        />

        <div className="space-y-3">
          {items.map((item) => {
            const etf = ETFs.find((e) => e.ticker === item.selected_ticker);
            const startAlloc = Math.round(starting * item.allocation_percent) / 100;
            const monthlyAlloc = Math.round(monthly * item.allocation_percent) / 100;
            const isSwapped = item.selected_ticker !== item.default_ticker;

            return (
              <Card key={item.role_id} padding="sm">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-400 font-medium mb-0.5">{item.role_label}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-bold text-slate-800">{item.selected_ticker}</span>
                      {isSwapped && <span className="text-xs text-slate-400">(swapped)</span>}
                      {etf && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riskBadge[etf.riskLevel]}`}>
                          {etf.riskLevel} risk
                        </span>
                      )}
                    </div>
                    {etf && <p className="text-xs text-slate-400 mt-0.5">{etf.name}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-slate-700">{item.allocation_percent}%</p>
                  </div>
                </div>

                {/* % bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 mb-3">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{ width: `${item.allocation_percent}%` }}
                  />
                </div>

                {/* Role description */}
                <p className="text-xs text-slate-500 leading-relaxed mb-3">{item.role_description}</p>

                {/* Dollar amounts */}
                {(starting > 0 || monthly > 0) && (
                  <div className="flex gap-4 text-xs mb-3">
                    {starting > 0 && (
                      <div>
                        <p className="text-slate-400">Starting</p>
                        <p className="font-semibold text-slate-700">{formatCurrency(startAlloc)}</p>
                      </div>
                    )}
                    {monthly > 0 && (
                      <div>
                        <p className="text-slate-400">Monthly</p>
                        <p className="font-semibold text-slate-700">{formatCurrency(monthlyAlloc)}/mo</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Swap controls */}
                {item.alternative_tickers.length > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    {isSwapped ? (
                      <button
                        onClick={() => swapTicker(item.role_id, item.default_ticker)}
                        className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
                      >
                        ↩ Back to {item.default_ticker}
                      </button>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-xs text-slate-400">Similar ETF example:</span>
                        {item.alternative_tickers.map((alt) => (
                          <button
                            key={alt}
                            onClick={() => swapTicker(item.role_id, alt)}
                            className="text-xs px-2 py-0.5 rounded border border-slate-200 bg-white text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer font-medium"
                          >
                            Swap to {alt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {items.some((item) => item.alternative_tickers.length > 0) && (
          <p className="text-xs text-slate-400 leading-relaxed mt-3">
            Similar does not mean identical. Compare fees, holdings, provider, and risk before making real investment decisions.
          </p>
        )}

        {/* Total row */}
        <div className="mt-3 flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 text-sm">
          <span className="font-semibold text-slate-700">Total</span>
          <div className="flex gap-4 text-xs">
            {starting > 0 && <span className="font-semibold text-slate-700">{formatCurrency(starting)} starting</span>}
            {monthly > 0 && <span className="font-semibold text-slate-700">{formatCurrency(monthly)}/mo</span>}
            <span className="font-semibold text-slate-700">100%</span>
          </div>
        </div>
      </div>

      {/* What this means */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">What this sample allocation means</p>
          {onAssetClassExplorer && (
            <button
              onClick={onAssetClassExplorer}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
            >
              Asset Class Explorer →
            </button>
          )}
        </div>
        <Card variant="muted" padding="sm">
          <p className="text-sm text-slate-700 leading-relaxed">{profileExplanation[profile]}</p>
        </Card>
      </div>

      {/* Coach explanation toggle */}
      {!showCoach ? (
        <button
          onClick={() => setShowCoach(true)}
          className="w-full py-2.5 rounded-xl text-sm font-medium border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer mb-6"
        >
          ✦ Explain my sample allocation
        </button>
      ) : (
        <div className="mb-6">
          <CoachExplanation
            content={profileSimulatorExplanations[profile]}
            onClose={() => setShowCoach(false)}
          />
        </div>
      )}

      {/* Ask Readiness Coach about allocation */}
      {onAskCoach && (
        <button
          onClick={() => {
            const allocationStr = items.map((i) => `${i.selected_ticker} ${i.allocation_percent}% (${i.role_label})`).join(", ");
            const q = [
              `Explain my Sample Learning Allocation for a ${profile} investor profile in plain English.`,
              `The allocation is: ${allocationStr}.`,
              monthly > 0 ? `Monthly contribution: ${formatCurrency(monthly)}.` : "",
              starting > 0 ? `Starting amount: ${formatCurrency(starting)}.` : "",
              `Timeline: ${timeline}.`,
              "Please explain the portfolio roles, what each ETF example represents, the risk levels involved, and why this is a sample learning allocation and not a real investment recommendation.",
            ].filter(Boolean).join(" ");
            onAskCoach(q);
          }}
          className="w-full py-2.5 rounded-xl text-sm font-medium border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer mb-6"
        >
          ✦ Ask the Readiness Coach about this allocation
        </button>
      )}

      {/* What-if Growth Projection */}
      <div className="border-t border-slate-200 pt-8 mb-8">
        <div className="mb-5">
          <SectionHeader
            title="What-if Growth Projection"
            description="Adjust the assumptions below to see how different scenarios could play out over time. These are estimates only — not predictions or guarantees."
          />
        </div>

        {/* Projection inputs */}
        <div className="mb-5">
          <Card>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">Projection assumptions</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-slate-700">Timeline (years)</p>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={projectionYears}
                  onChange={(e) => {
                    setProjectionYears(e.target.value);
                    onSharedInputsChange?.({ projectionYears: clampInput(e.target.value) });
                  }}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="20"
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-slate-700">Annual return assumption</p>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="30"
                    step="0.5"
                    value={annualReturn}
                    onChange={(e) => {
                      setAnnualReturn(e.target.value);
                      onSharedInputsChange?.({ annualReturnAssumption: clampInput(e.target.value) });
                    }}
                    className="w-full pr-7 pl-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="6"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">%</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-slate-700">Withdrawal rate</p>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={withdrawalRate}
                    onChange={(e) => {
                      setWithdrawalRate(e.target.value);
                      onSharedInputsChange?.({ withdrawalRate: clampInput(e.target.value) });
                    }}
                    className="w-full pr-7 pl-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="4"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">%</span>
                </div>
              </div>
            </div>

            {/* Scenario buttons */}
            <div className="mt-5 space-y-2">
              <p className="text-xs text-slate-400 font-medium">Quick scenarios (assumptions only — not predictions)</p>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Conservative — 4%", value: "4" },
                  { label: "Moderate — 6%", value: "6" },
                  { label: "Growth — 8%", value: "8" },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => {
                      setAnnualReturn(s.value);
                      onSharedInputsChange?.({ annualReturnAssumption: parseFloat(s.value) });
                    }}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors cursor-pointer
                      ${annualReturn === s.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-700"
                      }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Projection results */}
        <Card variant="muted" className="mb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Projected results</p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400">Starting amount</p>
              <p className="text-sm font-semibold text-slate-700">{formatCurrency(starting)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400">Monthly contribution</p>
              <p className="text-sm font-semibold text-slate-700">{formatCurrency(monthly)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400">Projection period</p>
              <p className="text-sm font-semibold text-slate-700">{projYears} years</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400">Annual return assumption</p>
              <p className="text-sm font-semibold text-slate-700">{annReturn}%</p>
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-4 mb-4">
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400">Total contributed</p>
              <p className="text-sm font-semibold text-slate-700">{formatCurrency(projection.totalContributed)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400">Estimated investment growth</p>
              <p className="text-sm font-semibold text-blue-700">{formatCurrency(Math.max(0, projection.estimatedGrowth))}</p>
            </div>
          </div>

          {/* Future value highlight */}
          <div className="bg-white border border-blue-200 rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Estimated future value</p>
              <p className="text-2xl font-bold text-blue-700">{formatCurrency(projection.futureValue)}</p>
            </div>
            <p className="text-xs text-slate-400 max-w-[180px] leading-relaxed text-right">
              If contributions continue for {projYears} years at {annReturn}% annually
            </p>
          </div>

          {/* Income estimate */}
          <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400">Est. annual income at {wRate}% withdrawal</p>
              <p className="text-sm font-semibold text-slate-700">{formatCurrency(projection.estimatedAnnualIncome)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400">Est. monthly income at {wRate}% withdrawal</p>
              <p className="text-sm font-semibold text-slate-700">{formatCurrency(projection.estimatedMonthlyIncome)}</p>
            </div>
          </div>
        </Card>

        {/* Ask Readiness Coach about projection */}
        {onAskCoach && (
          <button
            onClick={() => {
              const q = [
                "Explain my What-if Projection in plain English.",
                `Starting amount: ${formatCurrency(starting)}.`,
                `Monthly contribution: ${formatCurrency(monthly)}.`,
                `Timeline: ${projYears} years.`,
                `Annual return assumption: ${annReturn}%.`,
                `Estimated future value: ${formatCurrency(projection.futureValue)}.`,
                `Total contributed: ${formatCurrency(projection.totalContributed)}.`,
                `Withdrawal rate: ${wRate}%.`,
                `Estimated annual income at withdrawal: ${formatCurrency(projection.estimatedAnnualIncome)}.`,
                "Please explain what these projections mean, what assumptions are involved, and why the estimated future value is not guaranteed.",
              ].join(" ");
              onAskCoach(q);
            }}
            className="w-full py-2.5 rounded-xl text-sm font-medium border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer mb-5"
          >
            ✦ Ask the Readiness Coach about this projection
          </button>
        )}

        {/* Charts and milestones */}
        <ProjectionChart starting={starting} monthly={monthly} years={projYears} annualReturnPct={annReturn} />
        <ScenarioComparisonChart starting={starting} monthly={monthly} years={projYears} />
        <ProjectionMilestones starting={starting} monthly={monthly} years={projYears} annualReturnPct={annReturn} />

        {/* Profile note */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-5">
          <p className="text-xs text-blue-800 leading-relaxed">
            <span className="font-semibold">For {profile}s: </span>
            {profileProjectionNote[profile]}
          </p>
        </div>

        {/* Explanatory notes */}
        <div className="space-y-3 mb-5">
          <p className="text-xs text-slate-500 leading-relaxed">
            This projection estimates what your portfolio could grow to if your starting amount, monthly contributions, timeline, and annual return assumption stayed consistent. Real investment returns will not be smooth and are not guaranteed.
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Estimated income is based on a withdrawal-rate assumption. It does not mean the portfolio will produce guaranteed income or dividends.
          </p>
        </div>

        {/* Goal Feasibility entry */}
        <Card variant="muted" padding="sm" className="mb-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-slate-700">Have a specific target in mind?</p>
              <p className="text-xs text-slate-400 mt-0.5">Work backward from a goal amount to find the required monthly contribution.</p>
            </div>
            <button
              onClick={() => onGoalPlanner(starting, monthly)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors cursor-pointer whitespace-nowrap"
            >
              Goal Feasibility →
            </button>
          </div>
        </Card>
      </div>

      {/* Save plan */}
      <div className="mb-6">
        <Button
          variant="primary"
          fullWidth
          size="lg"
          onClick={handleSave}
          disabled={saveStatus === "saving"}
          className={
            saveStatus === "saved"
              ? "!bg-teal-600 !border-teal-600"
              : saveStatus === "error"
              ? "!bg-rose-600 !border-rose-600"
              : ""
          }
        >
          {saveStatus === "saving"
            ? "Saving…"
            : saveStatus === "saved"
            ? "✓ Saved successfully"
            : saveStatus === "error"
            ? "Could not save — try again"
            : "Save readiness plan"}
        </Button>
        {saveStatus === "idle" && (
          <p className="text-xs text-slate-400 text-center mt-2">
            Saves your current inputs, allocation, and projection to this session.
          </p>
        )}
      </div>

      <Disclaimer extended="This is a sample learning allocation and a what-if projection based on assumptions — not a prediction or guarantee. Past performance does not predict future results. Always consult a licensed financial advisor before making investment decisions." />
    </PageLayout>
  );
}
