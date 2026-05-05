"use client";

import { useState } from "react";
import type { QuizAnswers } from "./OnboardingQuiz";
import { deriveProfile } from "@/lib/etfs";
import type { Profile } from "@/lib/etfs";
import type { ContributionGuidanceSnapshot } from "@/lib/learningPlans";

type EmergencyStatus =
  | "Not started"
  | "Less than 1 month"
  | "1–3 months"
  | "3–6 months"
  | "6+ months";

const EMERGENCY_STATUSES: EmergencyStatus[] = [
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
    "This estimate is intentionally cautious. It leaves more room for emergency savings and unexpected expenses.",
  "Balanced Beginner":
    "This estimate tries to balance investing progress with monthly flexibility.",
  "Growth Beginner":
    "This estimate assumes you may be comfortable investing more of your surplus, but only after bills, debt, and savings are accounted for.",
};

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function clampInput(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) || n < 0 ? 0 : n;
}

function roundToNearest25(n: number): number {
  return Math.round(n / 25) * 25;
}

interface RangeResult {
  low: number;
  high: number;
  notes: string[];
}

function calculateContributionRange(
  surplus: number,
  profile: Profile,
  emergencyStatus: EmergencyStatus,
  billsPct: number,
  debtPct: number
): RangeResult {
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

type StartingCheckType = "neutral" | "caution" | "ok";

interface StartingCheck {
  message: string;
  type: StartingCheckType;
}

function deriveStartingCheck(
  startingInvestmentAmount: number,
  cashAvailableAboveProtected: number,
  hasBucketInputs: boolean
): StartingCheck {
  if (startingInvestmentAmount <= 0) {
    return { message: "No starting investment amount entered yet.", type: "neutral" };
  }
  if (!hasBucketInputs) {
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

function DollarInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />
    </div>
  );
}

interface Props {
  answers: QuizAnswers | null;
  onBack: () => void;
  onUseInSimulator: (monthly: number, starting: number) => void;
  onGuidanceResult?: (snapshot: ContributionGuidanceSnapshot) => void;
  onGoalPlanner?: () => void;
}

export default function ContributionGuidance({ answers, onBack, onUseInSimulator, onGuidanceResult, onGoalPlanner }: Props) {
  const derivedProfile = deriveProfile(answers);

  // Monthly cash flow
  const [takeHome, setTakeHome] = useState("");
  const [bills, setBills] = useState("");
  const [debt, setDebt] = useState("0");
  const [emergencySavings, setEmergencySavings] = useState("0");
  const [monthlyShortTermSavings, setMonthlyShortTermSavings] = useState("0");
  const [monthlyLifestyleBuffer, setMonthlyLifestyleBuffer] = useState("0");
  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyStatus>("Not started");
  const [profile, setProfile] = useState<Profile>(derivedProfile ?? "Balanced Beginner");

  // Money buckets
  const [currentCashSavings, setCurrentCashSavings] = useState("0");
  const [emergencyFundTarget, setEmergencyFundTarget] = useState("0");
  const [shortTermSavingsToProtect, setShortTermSavingsToProtect] = useState("0");
  const [startingInvestmentAmount, setStartingInvestmentAmount] = useState("0");

  // Parsed numbers
  const takeHomeNum = clampInput(takeHome);
  const billsNum = clampInput(bills);
  const debtNum = clampInput(debt);
  const emergencySavingsNum = clampInput(emergencySavings);
  const monthlyShortTermSavingsNum = clampInput(monthlyShortTermSavings);
  const monthlyLifestyleBufferNum = clampInput(monthlyLifestyleBuffer);
  const currentCashSavingsNum = clampInput(currentCashSavings);
  const emergencyFundTargetNum = clampInput(emergencyFundTarget);
  const shortTermSavingsToProtectNum = clampInput(shortTermSavingsToProtect);
  const startingInvestmentAmountNum = clampInput(startingInvestmentAmount);

  // Derived monthly calculations
  const hasIncome = takeHomeNum > 0;
  const surplus = Math.max(
    0,
    takeHomeNum - billsNum - debtNum - emergencySavingsNum
    - monthlyShortTermSavingsNum - monthlyLifestyleBufferNum
  );
  const billsPct = takeHomeNum > 0 ? (billsNum / takeHomeNum) * 100 : 0;
  const debtPct = takeHomeNum > 0 ? (debtNum / takeHomeNum) * 100 : 0;
  const savingsBufferPct = takeHomeNum > 0
    ? ((emergencySavingsNum + monthlyShortTermSavingsNum + monthlyLifestyleBufferNum) / takeHomeNum) * 100
    : 0;

  // Savings buckets calculations
  const protectedSavingsTarget = emergencyFundTargetNum + shortTermSavingsToProtectNum;
  const cashAvailableAboveProtected = currentCashSavingsNum - protectedSavingsTarget;
  const hasBucketInputs = currentCashSavingsNum > 0 || protectedSavingsTarget > 0;

  // Starting investment check
  const startingCheck = startingInvestmentAmountNum > 0
    ? deriveStartingCheck(startingInvestmentAmountNum, cashAvailableAboveProtected, hasBucketInputs)
    : { message: "No starting investment amount entered yet.", type: "neutral" as StartingCheckType };

  // Contribution range
  const { low, high, notes } = calculateContributionRange(
    surplus,
    profile,
    emergencyStatus,
    billsPct,
    debtPct
  );
  const midpoint = roundToNearest25((low + high) / 2);
  const hasRange = high > 0;
  const hasOkStarting = startingCheck.type === "ok";

  function handleUseInSimulator() {
    const monthly = hasRange ? midpoint : 0;
    const starting = hasOkStarting ? startingInvestmentAmountNum : 0;
    onGuidanceResult?.({
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
    });
    onUseInSimulator(monthly, starting);
  }

  const startingCheckStyle: Record<StartingCheckType, string> = {
    neutral: "bg-slate-50 border-slate-200 text-slate-600",
    caution: "bg-amber-50 border-amber-200 text-amber-700",
    ok: "bg-emerald-50 border-emerald-200 text-emerald-700",
  };
  const startingCheckIcon: Record<StartingCheckType, string> = {
    neutral: "○",
    caution: "⚠",
    ok: "✓",
  };

  return (
    <main className="min-h-screen px-6 py-14 max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer mb-8 inline-block"
      >
        ← Back
      </button>

      {/* Header */}
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Contribution Guidance</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          Enter your numbers to get an educational estimate of your investing capacity and a starting investment check.
          This is not financial advice.
        </p>
      </div>

      {/* Card 1: Monthly Cash Flow */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6 space-y-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Monthly Cash Flow</h2>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Monthly take-home pay</label>
          <p className="text-xs text-slate-400">After tax, the amount that hits your bank account each month.</p>
          <DollarInput value={takeHome} onChange={setTakeHome} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Monthly bills / fixed expenses</label>
          <p className="text-xs text-slate-400">Rent, utilities, subscriptions, insurance, groceries, and similar regular expenses.</p>
          <DollarInput value={bills} onChange={setBills} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Monthly debt payments</label>
          <p className="text-xs text-slate-400">Credit cards, student loans, car payments, or other debt obligations.</p>
          <DollarInput value={debt} onChange={setDebt} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Monthly emergency savings contribution</label>
          <p className="text-xs text-slate-400">Amount you set aside each month toward your emergency fund, if any.</p>
          <DollarInput value={emergencySavings} onChange={setEmergencySavings} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Monthly short-term savings contribution</label>
          <p className="text-xs text-slate-400">Money for goals you do not want exposed to market risk (e.g. vacation, car, home).</p>
          <DollarInput value={monthlyShortTermSavings} onChange={setMonthlyShortTermSavings} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Monthly lifestyle / play buffer</label>
          <p className="text-xs text-slate-400">Money you want to keep available for flexibility, fun, or non-essential spending.</p>
          <DollarInput value={monthlyLifestyleBuffer} onChange={setMonthlyLifestyleBuffer} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Emergency fund status</label>
            <select
              value={emergencyStatus}
              onChange={(e) => setEmergencyStatus(e.target.value as EmergencyStatus)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            >
              {EMERGENCY_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Investor profile
              {derivedProfile && (
                <span className="ml-2 text-xs font-normal text-emerald-600">(from your quiz)</span>
              )}
            </label>
            <select
              value={profile}
              onChange={(e) => setProfile(e.target.value as Profile)}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            >
              {PROFILES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Card 2: Current Money Buckets */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Your Current Money Buckets</h2>
          <p className="text-xs text-slate-400">Optional — used to check if a starting investment amount fits above your protected savings.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Current cash savings</label>
            <p className="text-xs text-slate-400">Total cash across checking, savings, and similar accounts.</p>
            <DollarInput value={currentCashSavings} onChange={setCurrentCashSavings} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Emergency fund target</label>
            <p className="text-xs text-slate-400">The amount you want to keep fully reserved for emergencies.</p>
            <DollarInput value={emergencyFundTarget} onChange={setEmergencyFundTarget} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Short-term savings to protect</label>
            <p className="text-xs text-slate-400">Money for goals you do not want exposed to market risk.</p>
            <DollarInput value={shortTermSavingsToProtect} onChange={setShortTermSavingsToProtect} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Starting investment amount</label>
            <p className="text-xs text-slate-400">The lump sum you are considering moving into investments.</p>
            <DollarInput value={startingInvestmentAmount} onChange={setStartingInvestmentAmount} />
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!hasIncome && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-5 py-6 text-center">
          <p className="text-sm text-slate-500">Enter your monthly take-home pay above to see your estimated investing capacity.</p>
        </div>
      )}

      {/* Results */}
      {hasIncome && (
        <div className="space-y-5">
          {/* Summary card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Based on the numbers entered
            </h2>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Monthly take-home pay</p>
                <p className="font-semibold text-slate-700">{fmt(takeHomeNum)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Bills as % of income</p>
                <p className={`font-semibold ${billsPct > 70 ? "text-red-600" : "text-slate-700"}`}>
                  {billsPct.toFixed(0)}%
                  {billsPct > 70 && <span className="ml-1 text-xs font-normal">(high)</span>}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Debt as % of income</p>
                <p className={`font-semibold ${debtPct > 20 ? "text-amber-600" : "text-slate-700"}`}>
                  {debtPct.toFixed(0)}%
                  {debtPct > 20 && <span className="ml-1 text-xs font-normal">(notable)</span>}
                </p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Savings & buffers as % of income</p>
                <p className="font-semibold text-slate-700">{savingsBufferPct.toFixed(0)}%</p>
              </div>
              {monthlyShortTermSavingsNum > 0 && (
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-400">Short-term savings / month</p>
                  <p className="font-semibold text-slate-700">{fmt(monthlyShortTermSavingsNum)}</p>
                </div>
              )}
              {monthlyLifestyleBufferNum > 0 && (
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-400">Lifestyle buffer / month</p>
                  <p className="font-semibold text-slate-700">{fmt(monthlyLifestyleBufferNum)}</p>
                </div>
              )}
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Estimated monthly surplus</p>
                <p className={`font-semibold ${surplus <= 0 ? "text-red-600" : "text-slate-700"}`}>
                  {fmt(surplus)}
                </p>
              </div>
            </div>

            {/* Contribution range highlight */}
            <div className={`rounded-xl px-5 py-4 border ${surplus <= 0 ? "bg-red-50 border-red-200" : "bg-white border-emerald-200"}`}>
              <p className="text-xs text-slate-400 mb-1">Estimated investing capacity (contribution range to consider)</p>
              {surplus <= 0 ? (
                <p className="text-sm text-red-700 font-medium">
                  Based on these numbers, there may not be enough monthly surplus to invest comfortably yet.
                </p>
              ) : (
                <p className="text-2xl font-bold text-emerald-700">
                  {fmt(low)} – {fmt(high)}<span className="text-base font-medium text-slate-500">/month</span>
                </p>
              )}
            </div>

            {/* Caution notes */}
            {notes.length > 0 && (
              <div className="space-y-2">
                {notes.map((note, i) => (
                  <div key={i} className="flex gap-2 items-start text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Starting investment check section */}
            {(hasBucketInputs || startingInvestmentAmountNum > 0) && (
              <div className="border-t border-slate-200 pt-4 space-y-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Starting Investment Check</p>

                {(protectedSavingsTarget > 0 || currentCashSavingsNum > 0) && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {protectedSavingsTarget > 0 && (
                      <div className="space-y-0.5">
                        <p className="text-xs text-slate-400">Protected savings target</p>
                        <p className="font-semibold text-slate-700">{fmt(protectedSavingsTarget)}</p>
                      </div>
                    )}
                    {currentCashSavingsNum > 0 && (
                      <div className="space-y-0.5">
                        <p className="text-xs text-slate-400">Cash above protected savings</p>
                        <p className={`font-semibold ${cashAvailableAboveProtected < 0 ? "text-red-600" : "text-slate-700"}`}>
                          {cashAvailableAboveProtected < 0
                            ? `${fmt(cashAvailableAboveProtected)} (shortfall)`
                            : fmt(cashAvailableAboveProtected)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className={`flex gap-2 items-start text-xs rounded-lg px-3 py-2.5 border ${startingCheckStyle[startingCheck.type]}`}>
                  <span className="shrink-0 mt-0.5 font-bold">{startingCheckIcon[startingCheck.type]}</span>
                  <span>{startingCheck.message}</span>
                </div>
              </div>
            )}
          </div>

          {/* Profile guidance */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <p className="text-xs text-emerald-800 leading-relaxed">
              <span className="font-semibold">For {profile}s: </span>
              {profileGuidanceText[profile]}
            </p>
          </div>

          {/* Use in simulator */}
          {(hasRange || hasOkStarting) ? (
            <button
              onClick={handleUseInSimulator}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              {hasRange && hasOkStarting
                ? `Use ${fmt(midpoint)}/month + ${fmt(startingInvestmentAmountNum)} starting in Portfolio Simulator →`
                : hasRange
                ? `Use ${fmt(midpoint)}/month in Portfolio Simulator →`
                : `Use ${fmt(startingInvestmentAmountNum)} as starting amount in Portfolio Simulator →`}
            </button>
          ) : (
            <div className="rounded-xl bg-slate-100 border border-slate-200 px-5 py-4">
              <p className="text-sm text-slate-500">
                Try adjusting your numbers or focus on building monthly surplus first before using the simulator.
              </p>
            </div>
          )}

          {/* Goal Planner link */}
          {onGoalPlanner && (
            <div className="text-center">
              <button
                onClick={onGoalPlanner}
                className="text-sm text-emerald-600 hover:text-emerald-800 transition-colors cursor-pointer"
              >
                Have a specific target amount in mind? → Goal Planner
              </button>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8 rounded-xl bg-slate-100 border border-slate-200 px-5 py-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-600">Educational only. Not financial advice. </span>
          This estimate is based only on the numbers entered and does not account for your full financial situation. Always consult a licensed financial advisor before making investment decisions.
        </p>
      </div>
    </main>
  );
}
