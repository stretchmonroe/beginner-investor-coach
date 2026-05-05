"use client";

import { useState } from "react";
import { ETFs, riskBadge, deriveProfile } from "@/lib/etfs";
import type { QuizAnswers } from "./OnboardingQuiz";
import type { Profile } from "@/lib/etfs";
import CoachExplanation from "./CoachExplanation";
import { profileSimulatorExplanations } from "@/lib/coachExplanations";
import { saveLearningPlan } from "@/lib/learningPlans";
import type { ContributionGuidanceSnapshot, LearningPlan, AllocationSnapshot } from "@/lib/learningPlans";
import SavedLearningPlans from "./SavedLearningPlans";
import ProjectionChart from "./ProjectionChart";
import ScenarioComparisonChart from "./ScenarioComparisonChart";
import ProjectionMilestones from "./ProjectionMilestones";

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

type Timeline = "Less than 3 years" | "3–10 years" | "10+ years";

const timelineWarning: Record<Timeline, string> = {
  "Less than 3 years":
    "For short timelines, stock-heavy ETFs may be too volatile. Money needed soon is usually better kept in lower-risk options.",
  "3–10 years":
    "This is a medium timeline. Balance growth with the risk that markets may be down when you need the money.",
  "10+ years":
    "A longer timeline can make growth-oriented ETFs easier to hold, but you should still be prepared for significant declines along the way.",
};

const timelineWarnStyle: Record<Timeline, string> = {
  "Less than 3 years": "bg-red-50 border-red-200 text-red-700",
  "3–10 years": "bg-amber-50 border-amber-200 text-amber-700",
  "10+ years": "bg-emerald-50 border-emerald-200 text-emerald-700",
};

const PROFILES: Profile[] = ["Conservative Beginner", "Balanced Beginner", "Growth Beginner"];
const TIMELINES: Timeline[] = ["Less than 3 years", "3–10 years", "10+ years"];

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function clamp(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) || n < 0 ? 0 : n;
}

function getDefaultReturnForProfile(p: Profile): number {
  if (p === "Conservative Beginner") return 4;
  if (p === "Balanced Beginner") return 6;
  return 8;
}

function getDefaultProjectionYearsForTimeline(t: Timeline): number {
  if (t === "Less than 3 years") return 3;
  if (t === "3–10 years") return 10;
  return 20;
}

function calculateFutureValue(
  starting: number,
  monthly: number,
  years: number,
  annualReturnPct: number
): number {
  const months = Math.round(years * 12);
  if (annualReturnPct === 0 || months === 0) return starting + monthly * months;
  const r = annualReturnPct / 100 / 12;
  return starting * Math.pow(1 + r, months) + monthly * ((Math.pow(1 + r, months) - 1) / r);
}

interface ProjectionResults {
  futureValue: number;
  totalContributed: number;
  estimatedGrowth: number;
  estimatedAnnualIncome: number;
  estimatedMonthlyIncome: number;
}

function calculateProjectionResults(
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
  return { futureValue, totalContributed, estimatedGrowth, estimatedAnnualIncome, estimatedMonthlyIncome };
}

interface Props {
  answers: QuizAnswers | null;
  onBack: () => void;
  prefillMonthly?: number | null;
  prefillStarting?: number | null;
  onContributionGuidance: () => void;
  onGoalPlanner: (starting: number, monthly: number) => void;
  onAssetClassExplorer?: () => void;
  sessionId: string;
  guidanceSnapshot?: ContributionGuidanceSnapshot | null;
}

export default function PortfolioSimulator({ answers, onBack, prefillMonthly, prefillStarting, onContributionGuidance, onGoalPlanner, onAssetClassExplorer, sessionId, guidanceSnapshot }: Props) {
  const derivedProfile = deriveProfile(answers);
  const initialProfile = derivedProfile ?? "Balanced Beginner";
  const initialTimeline = (answers?.timeline as Timeline) ?? "10+ years";

  const [startingAmount, setStartingAmount] = useState(
    prefillStarting != null ? String(prefillStarting) : "0"
  );
  const [monthlyContribution, setMonthlyContribution] = useState(
    prefillMonthly != null ? String(prefillMonthly) : "500"
  );
  const [timeline, setTimeline] = useState<Timeline>(initialTimeline);
  const [profile, setProfile] = useState<Profile>(initialProfile);
  const [showCoach, setShowCoach] = useState(false);

  const [projectionYears, setProjectionYears] = useState(
    String(getDefaultProjectionYearsForTimeline(initialTimeline))
  );
  const [annualReturn, setAnnualReturn] = useState(
    String(getDefaultReturnForProfile(initialProfile))
  );
  const [withdrawalRate, setWithdrawalRate] = useState("4");

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedRefreshTrigger, setSavedRefreshTrigger] = useState(0);
  const [loadedGuidance, setLoadedGuidance] = useState<ContributionGuidanceSnapshot | null>(null);
  const [swappedTickers, setSwappedTickers] = useState<Record<string, string>>({});

  const starting = clamp(startingAmount);
  const monthly = clamp(monthlyContribution);

  const items = allocationModels[profile].map((role) => ({
    ...role,
    selected_ticker: swappedTickers[role.role_id] ?? role.default_ticker,
  }));

  function swapTicker(role_id: string, ticker: string) {
    setSwappedTickers((prev) => ({ ...prev, [role_id]: ticker }));
  }

  const projYears = Math.min(Math.max(clamp(projectionYears), 1), 50);
  const annReturn = Math.min(Math.max(clamp(annualReturn), 0), 30);
  const wRate = Math.min(Math.max(clamp(withdrawalRate), 0), 20);

  const projection = calculateProjectionResults(starting, monthly, projYears, annReturn, wRate);

  const displayedGuidance = loadedGuidance ?? guidanceSnapshot ?? null;

  async function handleSave() {
    if (!sessionId) return;
    setSaveStatus("saving");
    const allocationData: AllocationSnapshot[] = items.map((item) => {
      const etf = ETFs.find((e) => e.ticker === item.selected_ticker);
      return {
        ticker: item.selected_ticker,
        etf_name: etf?.name ?? item.selected_ticker,
        allocation_percent: item.allocation_percent,
        starting_amount_allocation: starting > 0 ? Math.round(starting * item.allocation_percent) / 100 : 0,
        monthly_contribution_allocation: monthly > 0 ? Math.round(monthly * item.allocation_percent) / 100 : 0,
        risk_level: etf?.riskLevel ?? "",
        portfolio_role: item.role_label,
        role_id: item.role_id,
        role_label: item.role_label,
        alternative_tickers: item.alternative_tickers,
      };
    });
    try {
      await saveLearningPlan({
        anonymous_session_id: sessionId,
        investor_profile: profile,
        contribution_guidance_json: displayedGuidance,
        portfolio_inputs_json: {
          starting_amount: starting,
          monthly_contribution: monthly,
          timeline,
          investor_profile: profile,
        },
        allocation_json: allocationData,
        projection_assumptions_json: {
          projection_years: projYears,
          annual_return_assumption: annReturn,
          withdrawal_rate: wRate,
        },
        projection_results_json: {
          total_contributed: projection.totalContributed,
          estimated_future_value: projection.futureValue,
          estimated_investment_growth: Math.max(0, projection.estimatedGrowth),
          estimated_annual_income: projection.estimatedAnnualIncome,
          estimated_monthly_income: projection.estimatedMonthlyIncome,
        },
      });
      setSaveStatus("saved");
      setSavedRefreshTrigger((t) => t + 1);
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 4000);
    }
  }

  function handleViewPlan(plan: LearningPlan) {
    const pi = plan.portfolio_inputs_json;
    const pa = plan.projection_assumptions_json;
    setStartingAmount(String(pi.starting_amount));
    setMonthlyContribution(String(pi.monthly_contribution));
    setTimeline(pi.timeline as Timeline);
    setProfile(pi.investor_profile as Profile);
    setProjectionYears(String(pa.projection_years));
    setAnnualReturn(String(pa.annual_return_assumption));
    setWithdrawalRate(String(pa.withdrawal_rate));
    setLoadedGuidance(plan.contribution_guidance_json);
    setShowCoach(false);

    // Restore swapped tickers from the saved allocation
    const savedProfile = pi.investor_profile as Profile;
    const model = allocationModels[savedProfile];
    const restoredSwaps: Record<string, string> = {};
    for (const savedItem of plan.allocation_json) {
      if (savedItem.role_id) {
        const roleDefault = model.find((r) => r.role_id === savedItem.role_id);
        if (roleDefault && savedItem.ticker !== roleDefault.default_ticker) {
          restoredSwaps[savedItem.role_id] = savedItem.ticker;
        }
      }
    }
    setSwappedTickers(restoredSwaps);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen px-6 py-14 max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer mb-8 inline-block"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Portfolio Simulator</h1>
        <p className="text-slate-500 text-sm leading-relaxed max-w-xl">
          See how a sample learning allocation might divide your contributions across beginner-friendly ETFs.
          This is a sample educational exercise, not a recommendation to buy.
        </p>
      </div>

      {/* Inputs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">Your inputs</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Starting amount */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Starting amount</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                value={startingAmount}
                onChange={(e) => setStartingAmount(e.target.value)}
                className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="0"
              />
            </div>
            {prefillStarting != null && (
              <p className="text-xs text-emerald-600">Pre-filled from Contribution Guidance</p>
            )}
          </div>

          {/* Monthly contribution */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">Monthly contribution</label>
              <button
                onClick={onContributionGuidance}
                className="text-xs text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
              >
                Help me estimate →
              </button>
            </div>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                type="number"
                min="0"
                value={monthlyContribution}
                onChange={(e) => setMonthlyContribution(e.target.value)}
                className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="500"
              />
            </div>
            {prefillMonthly != null && (
              <p className="text-xs text-emerald-600">Pre-filled from Contribution Guidance</p>
            )}
          </div>

          {/* Timeline */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Timeline</label>
            <select
              value={timeline}
              onChange={(e) => setTimeline(e.target.value as Timeline)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            >
              {TIMELINES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Profile */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Investor profile
              {derivedProfile && (
                <span className="ml-2 text-xs font-normal text-emerald-600">(from your quiz)</span>
              )}
            </label>
            <select
              value={profile}
              onChange={(e) => { setProfile(e.target.value as Profile); setShowCoach(false); setSwappedTickers({}); }}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            >
              {PROFILES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Contribution guidance summary */}
      {displayedGuidance && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Contribution Guidance Summary
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <p className="text-slate-500">Monthly surplus</p>
              <p className="font-semibold text-slate-700">{fmt(displayedGuidance.monthly_surplus)}</p>
            </div>
            <div>
              <p className="text-slate-500">Estimated range</p>
              <p className="font-semibold text-emerald-700">
                {fmt(displayedGuidance.estimated_contribution_min)} – {fmt(displayedGuidance.estimated_contribution_max)}
              </p>
            </div>
            <div>
              <p className="text-slate-500">Suggested midpoint</p>
              <p className="font-semibold text-slate-700">{fmt(displayedGuidance.estimated_contribution_midpoint)}</p>
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
        </div>
      )}

      {/* Timeline warning */}
      <div className={`rounded-xl border px-5 py-3.5 mb-8 text-sm leading-relaxed ${timelineWarnStyle[timeline]}`}>
        {timelineWarning[timeline]}
      </div>

      {/* Allocation table */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
          Sample learning allocation — {profile}
        </h2>
        <p className="text-xs text-slate-400 leading-relaxed mb-4">
          These are sample ETF examples for each portfolio role. Some ETFs can serve a similar purpose, so you may see alternative examples where there is meaningful overlap.
        </p>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                <th className="text-left px-5 py-3">ETF example</th>
                <th className="text-left px-5 py-3">%</th>
                <th className="text-right px-5 py-3">Starting</th>
                <th className="text-right px-5 py-3">Monthly</th>
                <th className="text-left px-5 py-3 hidden sm:table-cell">Risk</th>
                <th className="text-left px-5 py-3 hidden sm:table-cell">Portfolio role</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const etf = ETFs.find((e) => e.ticker === item.selected_ticker);
                const startAlloc = Math.round(starting * item.allocation_percent) / 100;
                const monthlyAlloc = Math.round(monthly * item.allocation_percent) / 100;
                const isSwapped = item.selected_ticker !== item.default_ticker;
                return (
                  <tr
                    key={item.role_id}
                    className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                  >
                    <td className="px-5 py-4 align-top">
                      <span className="font-bold text-emerald-700">{item.selected_ticker}</span>
                      {isSwapped && (
                        <span className="ml-1.5 text-xs text-slate-400 font-normal">(swapped)</span>
                      )}
                      {etf && (
                        <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">{etf.name}</p>
                      )}
                      {/* Alternative / swap controls */}
                      {item.alternative_tickers.length > 0 && (
                        <div className="mt-2">
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
                                  className="text-xs px-2 py-0.5 rounded border border-slate-200 bg-white text-emerald-600 hover:border-emerald-300 hover:bg-emerald-50 transition-colors cursor-pointer font-medium"
                                >
                                  Swap to {alt}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-slate-100 rounded-full h-1.5">
                          <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${item.allocation_percent}%` }} />
                        </div>
                        <span className="text-slate-700 font-medium">{item.allocation_percent}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 align-top text-right text-slate-700 font-medium">
                      {starting > 0 ? fmt(startAlloc) : "—"}
                    </td>
                    <td className="px-5 py-4 align-top text-right text-slate-700 font-medium">
                      {monthly > 0 ? fmt(monthlyAlloc) : "—"}
                    </td>
                    <td className="px-5 py-4 align-top hidden sm:table-cell">
                      {etf && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${riskBadge[etf.riskLevel]}`}>
                          {etf.riskLevel}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 align-top hidden sm:table-cell">
                      <p className="text-xs font-medium text-slate-600">{item.role_label}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.role_description}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 border-t border-slate-200 text-sm font-semibold text-slate-700">
                <td className="px-5 py-3">Total</td>
                <td className="px-5 py-3">100%</td>
                <td className="px-5 py-3 text-right">{starting > 0 ? fmt(starting) : "—"}</td>
                <td className="px-5 py-3 text-right">{monthly > 0 ? fmt(monthly) : "—"}</td>
                <td className="hidden sm:table-cell" />
                <td className="hidden sm:table-cell" />
              </tr>
            </tfoot>
          </table>
        </div>
        {items.some((item) => item.alternative_tickers.length > 0) && (
          <p className="text-xs text-slate-400 leading-relaxed mt-3">
            Similar does not mean identical. Compare fees, holdings, provider, and risk before making real investment decisions.
          </p>
        )}
      </div>

      {/* Plain-English explanation */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            What this sample allocation means
          </h2>
          {onAssetClassExplorer && (
            <button
              onClick={onAssetClassExplorer}
              className="text-xs text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer shrink-0"
            >
              Asset Class Explorer →
            </button>
          )}
        </div>
        <p className="text-sm text-slate-700 leading-relaxed">{profileExplanation[profile]}</p>
      </div>

      {/* Coach explanation */}
      {!showCoach ? (
        <button
          onClick={() => setShowCoach(true)}
          className="w-full py-2.5 rounded-xl text-sm font-medium border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer mb-6"
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

      {/* ── What-if Projection Calculator ─────────────────────────────── */}
      <div className="border-t border-slate-200 pt-8 mb-8">
        <div className="mb-6 space-y-1">
          <h2 className="text-xl font-bold text-slate-900">What-if Growth Projection</h2>
          <p className="text-sm text-slate-500 leading-relaxed">
            Adjust the assumptions below to see how different scenarios could play out over time.
            These are estimates only — not predictions or guarantees.
          </p>
        </div>

        {/* Projection inputs */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-5">
            Projection assumptions
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Projection years */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Timeline (years)</label>
              <input
                type="number"
                min="1"
                max="50"
                value={projectionYears}
                onChange={(e) => setProjectionYears(e.target.value)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="20"
              />
            </div>

            {/* Annual return */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Annual return assumption</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.5"
                  value={annualReturn}
                  onChange={(e) => setAnnualReturn(e.target.value)}
                  className="w-full pr-7 pl-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="6"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
              </div>
            </div>

            {/* Withdrawal rate */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Withdrawal rate</label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={withdrawalRate}
                  onChange={(e) => setWithdrawalRate(e.target.value)}
                  className="w-full pr-7 pl-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="4"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
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
                  onClick={() => setAnnualReturn(s.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors cursor-pointer
                    ${annualReturn === s.value
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                    }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Projection results */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Projected results
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400">Starting amount</p>
              <p className="text-sm font-semibold text-slate-700">{fmt(starting)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400">Monthly contribution</p>
              <p className="text-sm font-semibold text-slate-700">{fmt(monthly)}</p>
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

          <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400">Total contributed</p>
              <p className="text-sm font-semibold text-slate-700">{fmt(projection.totalContributed)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400">Estimated investment growth</p>
              <p className="text-sm font-semibold text-emerald-700">{fmt(Math.max(0, projection.estimatedGrowth))}</p>
            </div>
          </div>

          {/* Future value highlight */}
          <div className="bg-white border border-emerald-200 rounded-xl px-5 py-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-xs text-slate-400 mb-0.5">Estimated future value</p>
              <p className="text-2xl font-bold text-emerald-700">{fmt(projection.futureValue)}</p>
            </div>
            <p className="text-xs text-slate-400 max-w-[180px] leading-relaxed text-right">
              If contributions continue for {projYears} years at {annReturn}% annually
            </p>
          </div>

          {/* Income estimate */}
          <div className="border-t border-slate-200 pt-4 grid grid-cols-2 gap-4">
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400">Est. annual income at {wRate}% withdrawal</p>
              <p className="text-sm font-semibold text-slate-700">{fmt(projection.estimatedAnnualIncome)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-xs text-slate-400">Est. monthly income at {wRate}% withdrawal</p>
              <p className="text-sm font-semibold text-slate-700">{fmt(projection.estimatedMonthlyIncome)}</p>
            </div>
          </div>
        </div>

        {/* Charts and milestones */}
        <ProjectionChart starting={starting} monthly={monthly} years={projYears} annualReturnPct={annReturn} />
        <ScenarioComparisonChart starting={starting} monthly={monthly} years={projYears} />
        <ProjectionMilestones starting={starting} monthly={monthly} years={projYears} annualReturnPct={annReturn} />

        {/* Profile note */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-5">
          <p className="text-xs text-emerald-800 leading-relaxed">
            <span className="font-semibold">For {profile}s: </span>
            {profileProjectionNote[profile]}
          </p>
        </div>

        {/* Plain-English explanations */}
        <div className="space-y-3 mb-5">
          <p className="text-xs text-slate-500 leading-relaxed">
            This projection estimates what your portfolio could grow to if your starting amount, monthly contributions, timeline, and annual return assumption stayed consistent. Real investment returns will not be smooth and are not guaranteed.
          </p>
          <p className="text-xs text-slate-500 leading-relaxed">
            Estimated income is based on a withdrawal-rate assumption. It does not mean the portfolio will produce guaranteed income or dividends.
          </p>
        </div>

        {/* Goal Planner entry */}
        <div className="border border-slate-200 rounded-xl px-4 py-3 mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Have a specific target in mind?</p>
            <p className="text-xs text-slate-400 mt-0.5">Work backward from a goal amount to find the required monthly contribution.</p>
          </div>
          <button
            onClick={() => onGoalPlanner(starting, monthly)}
            className="text-sm text-emerald-600 hover:text-emerald-800 font-medium transition-colors cursor-pointer whitespace-nowrap"
          >
            Goal Planner →
          </button>
        </div>
      </div>

      {/* Save learning plan */}
      <div className="mb-6">
        <button
          onClick={handleSave}
          disabled={saveStatus === "saving"}
          className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-colors
            ${saveStatus === "saving"
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : saveStatus === "saved"
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200 cursor-pointer"
              : saveStatus === "error"
              ? "bg-red-50 text-red-700 border border-red-200 cursor-pointer"
              : "bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer"}`}
        >
          {saveStatus === "saving"
            ? "Saving…"
            : saveStatus === "saved"
            ? "✓ Saved successfully"
            : saveStatus === "error"
            ? "Could not save — try again"
            : "Save learning plan"}
        </button>
        {saveStatus === "idle" && (
          <p className="text-xs text-slate-400 text-center mt-2">
            Saves your current inputs, allocation, and projection to this session.
          </p>
        )}
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl bg-slate-100 border border-slate-200 px-5 py-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-600">Educational only. Not financial advice. </span>
          This is a sample learning allocation and a what-if projection based on assumptions — not a prediction or guarantee. Past performance does not predict future results. Always consult a licensed financial advisor before making investment decisions.
        </p>
      </div>

      <SavedLearningPlans
        sessionId={sessionId}
        refreshTrigger={savedRefreshTrigger}
        onView={handleViewPlan}
      />
    </main>
  );
}
