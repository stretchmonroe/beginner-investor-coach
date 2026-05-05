"use client";

import { useState } from "react";
import type { QuizAnswers } from "./OnboardingQuiz";
import { deriveProfile } from "@/lib/etfs";
import type { Profile } from "@/lib/etfs";
import type { ContributionGuidanceSnapshot } from "@/lib/learningPlans";
import type { EmergencyFundStatus, StartingCheckType } from "@/types/readinessPlan";
import {
  calculateMonthlySurplus,
  calculateProtectedSavingsTarget,
  calculateCashAvailableAboveProtectedSavings,
  calculateContributionRange,
  calculateStartingInvestmentCheck,
} from "@/lib/readinessCalculations";
import { formatCurrency, roundToNearest25 } from "@/lib/formatters";
import PageLayout from "@/components/ui/PageLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import Disclaimer from "@/components/ui/Disclaimer";

const EMERGENCY_STATUSES: EmergencyFundStatus[] = [
  "Not started",
  "Less than 1 month",
  "1–3 months",
  "3–6 months",
  "6+ months",
];

const PROFILES: Profile[] = [
  "Conservative Beginner",
  "Balanced Beginner",
  "Growth Beginner",
];

const profileGuidanceText: Record<Profile, string> = {
  "Conservative Beginner":
    "This estimate is intentionally cautious. It leaves more room for emergency savings, protected cash, and unexpected expenses.",
  "Balanced Beginner":
    "This estimate tries to balance investing progress with monthly flexibility.",
  "Growth Beginner":
    "This estimate assumes you may be comfortable investing more of your available surplus, but only after bills, debt, protected savings, and lifestyle buffer are accounted for.",
};

const checkStyle: Record<StartingCheckType, string> = {
  neutral: "bg-slate-50 border-slate-200 text-slate-600",
  caution: "bg-amber-50 border-amber-200 text-amber-700",
  ok: "bg-teal-50 border-teal-200 text-teal-700",
};
const checkIcon: Record<StartingCheckType, string> = {
  neutral: "○",
  caution: "⚠",
  ok: "✓",
};

function clamp(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) || n < 0 ? 0 : n;
}

function DollarInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">$</span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {hint && <p className="text-xs text-slate-400 leading-snug">{hint}</p>}
      {children}
    </div>
  );
}

interface Props {
  answers: QuizAnswers | null;
  onBack: () => void;
  onUseInSimulator: (monthly: number, starting: number) => void;
  onGuidanceResult?: (snapshot: ContributionGuidanceSnapshot) => void;
  onGoalPlanner?: (monthly: number, starting: number) => void;
}

export default function ContributionGuidance({
  answers,
  onBack,
  onUseInSimulator,
  onGuidanceResult,
  onGoalPlanner,
}: Props) {
  const derivedProfile = deriveProfile(answers);

  // A – Monthly Cash Flow
  const [takeHome, setTakeHome] = useState("");
  const [bills, setBills] = useState("");
  const [debt, setDebt] = useState("0");

  // B – Savings Buckets
  const [currentCashSavings, setCurrentCashSavings] = useState("0");
  const [emergencyFundTarget, setEmergencyFundTarget] = useState("0");
  const [shortTermSavingsToProtect, setShortTermSavingsToProtect] = useState("0");
  const [startingInvestmentAmount, setStartingInvestmentAmount] = useState("0");

  // C – Monthly Buffers
  const [emergencySavings, setEmergencySavings] = useState("0");
  const [monthlyShortTermSavings, setMonthlyShortTermSavings] = useState("0");
  const [monthlyLifestyleBuffer, setMonthlyLifestyleBuffer] = useState("0");

  // Profile & emergency fund status
  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyFundStatus>("Not started");
  const [profile, setProfile] = useState<Profile>(derivedProfile ?? "Balanced Beginner");

  // Parsed values
  const takeHomeNum = clamp(takeHome);
  const billsNum = clamp(bills);
  const debtNum = clamp(debt);
  const currentCashSavingsNum = clamp(currentCashSavings);
  const emergencyFundTargetNum = clamp(emergencyFundTarget);
  const shortTermSavingsToProtectNum = clamp(shortTermSavingsToProtect);
  const startingInvestmentAmountNum = clamp(startingInvestmentAmount);
  const emergencySavingsNum = clamp(emergencySavings);
  const monthlyShortTermSavingsNum = clamp(monthlyShortTermSavings);
  const monthlyLifestyleBufferNum = clamp(monthlyLifestyleBuffer);

  // Derived calculations
  const hasIncome = takeHomeNum > 0;
  const surplus = calculateMonthlySurplus(
    takeHomeNum, billsNum, debtNum,
    emergencySavingsNum, monthlyShortTermSavingsNum, monthlyLifestyleBufferNum
  );
  const billsPct = takeHomeNum > 0 ? (billsNum / takeHomeNum) * 100 : 0;
  const debtPct = takeHomeNum > 0 ? (debtNum / takeHomeNum) * 100 : 0;
  const protectedSavingsTarget = calculateProtectedSavingsTarget(emergencyFundTargetNum, shortTermSavingsToProtectNum);
  const cashAvailableAboveProtected = calculateCashAvailableAboveProtectedSavings(currentCashSavingsNum, protectedSavingsTarget);
  const hasBucketInputs = currentCashSavingsNum > 0 || protectedSavingsTarget > 0;
  const startingCheck = calculateStartingInvestmentCheck(startingInvestmentAmountNum, cashAvailableAboveProtected, hasBucketInputs);
  const { low, high, notes } = calculateContributionRange(surplus, profile, emergencyStatus, billsPct, debtPct);
  const midpoint = roundToNearest25((low + high) / 2);
  const hasRange = high > 0;
  const hasOkStarting = startingCheck.type === "ok";
  const canUse = hasRange || hasOkStarting;

  function buildSnapshot(): ContributionGuidanceSnapshot {
    return {
      monthly_take_home_pay: takeHomeNum,
      monthly_bills: billsNum,
      monthly_debt_payments: debtNum,
      monthly_emergency_savings_contribution: emergencySavingsNum,
      emergency_fund_status: emergencyStatus,
      monthly_surplus: surplus,
      bills_percentage: billsPct,
      debt_percentage: debtPct,
      estimated_contribution_min: low,
      estimated_contribution_max: high,
      estimated_contribution_midpoint: midpoint,
      caution_notes: notes,
      current_cash_savings: currentCashSavingsNum,
      emergency_fund_target: emergencyFundTargetNum,
      short_term_savings_to_protect: shortTermSavingsToProtectNum,
      starting_investment_amount: startingInvestmentAmountNum,
      monthly_short_term_savings_contribution: monthlyShortTermSavingsNum,
      monthly_lifestyle_play_buffer: monthlyLifestyleBufferNum,
      protected_savings_target: protectedSavingsTarget,
      cash_available_above_protected_savings: cashAvailableAboveProtected,
      starting_investment_check_message: startingCheck.message,
    };
  }

  function handleUseInGoalPlanner() {
    onGuidanceResult?.(buildSnapshot());
    onGoalPlanner?.(hasRange ? midpoint : 0, hasOkStarting ? startingInvestmentAmountNum : 0);
  }

  function handleUseInSimulator() {
    onGuidanceResult?.(buildSnapshot());
    onUseInSimulator(hasRange ? midpoint : 0, hasOkStarting ? startingInvestmentAmountNum : 0);
  }

  return (
    <PageLayout maxWidth="md">
      <PageHeader
        title="Money Snapshot"
        description="Estimate your investing capacity using your income, bills, savings buckets, protected cash, and lifestyle buffer."
        action={
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
        }
      />

      {/* Helper copy */}
      <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <p className="text-sm text-blue-700 leading-relaxed">
          This helps you understand what may be realistic before building a sample allocation or setting a target goal.
        </p>
      </div>

      {/* A: Monthly Cash Flow */}
      <div className="mb-5">
        <SectionHeader
          title="A. Monthly Cash Flow"
          description="Use after-tax income if possible. This makes the estimate more realistic."
        />
        <Card>
          <div className="space-y-5">
            <Field label="Monthly take-home pay" hint="After tax — the amount that lands in your bank account each month.">
              <DollarInput value={takeHome} onChange={setTakeHome} />
            </Field>
            <Field label="Monthly bills / fixed expenses" hint="Rent, utilities, subscriptions, insurance, groceries, and similar regular costs.">
              <DollarInput value={bills} onChange={setBills} />
            </Field>
            <Field label="Monthly debt payments" hint="Credit cards, student loans, car payments, or other debt obligations.">
              <DollarInput value={debt} onChange={setDebt} />
            </Field>
          </div>
        </Card>
      </div>

      {/* B: Savings Buckets */}
      <div className="mb-5">
        <SectionHeader
          title="B. Savings Buckets"
          description="Protected savings are funds you do not want exposed to market risk, like emergency savings or money needed soon."
        />
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Current cash savings" hint="Total cash across checking, savings, and similar accounts.">
              <DollarInput value={currentCashSavings} onChange={setCurrentCashSavings} />
            </Field>
            <Field label="Emergency fund target" hint="The amount you want to keep fully reserved for emergencies.">
              <DollarInput value={emergencyFundTarget} onChange={setEmergencyFundTarget} />
            </Field>
            <Field label="Short-term savings to protect" hint="Money for goals you do not want exposed to market risk.">
              <DollarInput value={shortTermSavingsToProtect} onChange={setShortTermSavingsToProtect} />
            </Field>
            <Field label="Starting investment amount" hint="The lump sum you are considering moving into investments.">
              <DollarInput value={startingInvestmentAmount} onChange={setStartingInvestmentAmount} />
            </Field>
          </div>
        </Card>
      </div>

      {/* C: Monthly Buffers */}
      <div className="mb-5">
        <SectionHeader
          title="C. Monthly Buffers"
          description="Your lifestyle/play buffer is money you want to keep available for flexibility, fun, or non-essential spending."
        />
        <Card>
          <div className="space-y-5">
            <Field label="Monthly emergency savings contribution" hint="Amount you set aside each month toward your emergency fund.">
              <DollarInput value={emergencySavings} onChange={setEmergencySavings} />
            </Field>
            <Field label="Monthly short-term savings contribution" hint="For goals you do not want exposed to market risk — vacation, car, home.">
              <DollarInput value={monthlyShortTermSavings} onChange={setMonthlyShortTermSavings} />
            </Field>
            <Field label="Monthly lifestyle / play buffer" hint="Money you want to keep available for flexibility, fun, or non-essential spending.">
              <DollarInput value={monthlyLifestyleBuffer} onChange={setMonthlyLifestyleBuffer} />
            </Field>
          </div>
        </Card>
      </div>

      {/* Profile & Emergency Fund Status */}
      <div className="mb-8">
        <SectionHeader title="Profile &amp; Emergency Fund" />
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Emergency fund status">
              <select
                value={emergencyStatus}
                onChange={(e) => setEmergencyStatus(e.target.value as EmergencyFundStatus)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              >
                {EMERGENCY_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label={derivedProfile ? "Investor profile (from your quiz)" : "Investor profile"}>
              <select
                value={profile}
                onChange={(e) => setProfile(e.target.value as Profile)}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              >
                {PROFILES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>
          </div>
        </Card>
      </div>

      {/* Empty state */}
      {!hasIncome && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-5 py-6 text-center mb-8">
          <p className="text-sm text-slate-500">
            Enter your monthly take-home pay above to see your estimated investing capacity.
          </p>
        </div>
      )}

      {/* Results — Investing Capacity Estimate */}
      {hasIncome && (
        <div className="mb-8 space-y-5">
          <SectionHeader
            title="Investing Capacity Estimate"
            description="Based on the numbers entered — not a prediction or guarantee."
          />

          {/* Cash flow summary */}
          <Card>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Monthly take-home pay</p>
                <p className="text-sm font-semibold text-slate-700">{formatCurrency(takeHomeNum)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Estimated monthly surplus</p>
                <p className={`text-sm font-semibold ${surplus <= 0 ? "text-red-600" : "text-slate-700"}`}>
                  {formatCurrency(surplus)}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Bills as % of income</p>
                <p className={`text-sm font-semibold ${billsPct > 70 ? "text-red-600" : "text-slate-700"}`}>
                  {billsPct.toFixed(0)}%
                  {billsPct > 70 && <span className="ml-1 text-xs font-normal text-red-500">(high)</span>}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Debt as % of income</p>
                <p className={`text-sm font-semibold ${debtPct > 20 ? "text-amber-600" : "text-slate-700"}`}>
                  {debtPct.toFixed(0)}%
                  {debtPct > 20 && <span className="ml-1 text-xs font-normal text-amber-500">(notable)</span>}
                </p>
              </div>
            </div>
          </Card>

          {/* Protected savings */}
          {hasBucketInputs && (
            <Card>
              <div className="grid grid-cols-2 gap-4">
                {protectedSavingsTarget > 0 && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-400">Protected savings target</p>
                    <p className="text-sm font-semibold text-slate-700">{formatCurrency(protectedSavingsTarget)}</p>
                  </div>
                )}
                {currentCashSavingsNum > 0 && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-400">Cash above protected savings</p>
                    <p className={`text-sm font-semibold ${cashAvailableAboveProtected < 0 ? "text-red-600" : "text-slate-700"}`}>
                      {cashAvailableAboveProtected < 0
                        ? `${formatCurrency(cashAvailableAboveProtected)} (shortfall)`
                        : formatCurrency(cashAvailableAboveProtected)}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Starting investment check */}
          {(hasBucketInputs || startingInvestmentAmountNum > 0) && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                Starting investment check
              </p>
              <div className={`flex gap-2.5 items-start text-sm rounded-xl px-4 py-3.5 border ${checkStyle[startingCheck.type]}`}>
                <span className="shrink-0 font-bold mt-0.5">{checkIcon[startingCheck.type]}</span>
                <span className="leading-relaxed">{startingCheck.message}</span>
              </div>
            </div>
          )}

          {/* Contribution range */}
          <div className={`rounded-2xl border px-6 py-5 ${surplus <= 0 ? "bg-slate-50 border-slate-200" : "bg-white border-slate-100 shadow-sm"}`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Contribution range to consider
            </p>
            {surplus <= 0 ? (
              <p className="text-sm text-slate-600 leading-relaxed">
                Based on these numbers, there may not be enough monthly surplus to invest comfortably yet.
              </p>
            ) : (
              <>
                <p className="text-2xl font-bold text-teal-700">
                  {formatCurrency(low)} – {formatCurrency(high)}
                  <span className="text-base font-medium text-slate-400 ml-1">/month</span>
                </p>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Educational estimate based on the numbers entered. Not a recommendation.
                </p>
              </>
            )}
          </div>

          {/* Caution notes */}
          {notes.length > 0 && (
            <div className="space-y-2">
              {notes.map((note, i) => (
                <div key={i} className="flex gap-2.5 items-start text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <span className="shrink-0 mt-0.5">⚠</span>
                  <span className="leading-relaxed">{note}</span>
                </div>
              ))}
            </div>
          )}

          {/* Profile guidance */}
          <Card variant="muted" padding="sm">
            <p className="text-xs text-slate-600 leading-relaxed px-1">
              <span className="font-semibold">For {profile}s: </span>
              {profileGuidanceText[profile]}
            </p>
          </Card>

          {/* CTAs */}
          {canUse ? (
            <div className="space-y-3 pt-1">
              {onGoalPlanner && (
                <Button variant="primary" fullWidth onClick={handleUseInGoalPlanner} size="lg">
                  Use this in Goal Planner →
                </Button>
              )}
              <button
                onClick={handleUseInSimulator}
                className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer py-2 text-center"
              >
                {onGoalPlanner
                  ? "Use in Portfolio Simulator instead"
                  : hasRange && hasOkStarting
                  ? `Use ${formatCurrency(midpoint)}/month + ${formatCurrency(startingInvestmentAmountNum)} starting in Portfolio Simulator →`
                  : hasRange
                  ? `Use ${formatCurrency(midpoint)}/month in Portfolio Simulator →`
                  : `Use ${formatCurrency(startingInvestmentAmountNum)} as starting amount in Portfolio Simulator →`}
              </button>
            </div>
          ) : (
            <Card variant="muted" padding="sm">
              <p className="text-sm text-slate-500 px-1">
                Try adjusting your numbers or focus on building monthly surplus first before using the simulator.
              </p>
            </Card>
          )}
        </div>
      )}

      <Disclaimer extended="This estimate is based only on the numbers entered and does not account for your full financial situation. Always consult a licensed financial advisor before making investment decisions." />
    </PageLayout>
  );
}
