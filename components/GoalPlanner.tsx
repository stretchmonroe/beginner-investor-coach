"use client";

import { useState } from "react";
import type { QuizAnswers } from "./OnboardingQuiz";
import { deriveProfile } from "@/lib/etfs";
import type { Profile } from "@/lib/etfs";
import type { FeasibilityStatus, GoalPlan } from "@/types/readinessPlan";
import {
  calculateRequiredMonthlyContribution,
  calculateFutureValue,
  calculateGoalFeasibility,
} from "@/lib/readinessCalculations";
import { formatCurrency } from "@/lib/formatters";
import PageLayout from "@/components/ui/PageLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import SectionHeader from "@/components/ui/SectionHeader";
import Disclaimer from "@/components/ui/Disclaimer";

const PROFILES: Profile[] = ["Conservative Beginner", "Balanced Beginner", "Growth Beginner"];

function getDefaultReturn(p: Profile): number {
  if (p === "Conservative Beginner") return 4;
  if (p === "Balanced Beginner") return 6;
  return 8;
}

function clamp(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) || n < 0 ? 0 : n;
}

function DollarInput({
  value,
  onChange,
  placeholder = "0",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">$</span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {hint && <p className="text-xs text-slate-400 leading-snug">{hint}</p>}
      {children}
    </div>
  );
}

type StatusStyle = { bg: string; border: string; text: string };
const statusStyles: Record<FeasibilityStatus, StatusStyle> = {
  covered:    { bg: "bg-blue-50",  border: "border-blue-200",  text: "text-blue-700"  },
  "on-track": { bg: "bg-teal-50",  border: "border-teal-200",  text: "text-teal-700"  },
  close:      { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700" },
  difficult:  { bg: "bg-rose-50",  border: "border-rose-200",  text: "text-rose-700"  },
};

const statusLabels: Record<FeasibilityStatus, string> = {
  covered:    "Target already covered by starting amount",
  "on-track": "On track based on assumptions",
  close:      "Close, but may need adjustment",
  difficult:  "Likely difficult based on current contribution",
};

const statusExplanations: Record<FeasibilityStatus, string> = {
  covered:
    "Based on the starting amount entered, this target is already covered before accounting for future contributions or returns.",
  "on-track":
    "Based on these assumptions, your estimated monthly investing capacity could support this target.",
  close:
    "Based on these assumptions, this goal may be possible with some adjustment. The monthly gap is relatively small compared with the required contribution.",
  difficult:
    "Based on these assumptions, this target may be difficult within the selected timeframe at the current contribution level.",
};

interface Props {
  answers: QuizAnswers | null;
  prefillMonthly?: number | null;
  prefillStarting?: number | null;
  onBack: () => void;
  onUseInSimulator: (monthly: number, starting: number, goalPlan?: GoalPlan) => void;
}

export default function GoalPlanner({
  answers,
  prefillMonthly,
  prefillStarting,
  onBack,
  onUseInSimulator,
}: Props) {
  const derivedProfile = deriveProfile(answers) ?? "Balanced Beginner";
  const hasMoneySnapshotData = prefillMonthly != null || prefillStarting != null;

  // A — Your Goal
  const [target, setTarget] = useState("1000000");
  const [years, setYears] = useState("15");

  // B — Your Current Plan
  const [starting, setStarting] = useState(prefillStarting != null ? String(prefillStarting) : "0");
  const [affordable, setAffordable] = useState(prefillMonthly != null ? String(prefillMonthly) : "500");
  const [annualReturn, setAnnualReturn] = useState(String(getDefaultReturn(derivedProfile)));
  const [profile, setProfile] = useState<Profile>(derivedProfile);

  // Parsed values
  const targetNum = clamp(target);
  const yearsNum = Math.min(Math.max(clamp(years), 0), 50);
  const startingNum = clamp(starting);
  const affordableNum = clamp(affordable);
  const annReturnNum = Math.min(Math.max(clamp(annualReturn), 0), 30);

  const hasTimelineError = yearsNum === 0;
  const showResults = targetNum > 0 && !hasTimelineError;

  // Does starting amount already cover the target?
  const startingAlreadyCovers = targetNum > 0 && startingNum >= targetNum;
  const fvOfStarting =
    yearsNum > 0 && annReturnNum > 0
      ? startingNum * Math.pow(1 + annReturnNum / 100 / 12, Math.round(yearsNum * 12))
      : startingNum;
  const growthCoversTarget = targetNum > 0 && !startingAlreadyCovers && fvOfStarting >= targetNum;
  const targetCovered = startingAlreadyCovers || growthCoversTarget;

  // Core calculations (lib functions)
  const requiredMonthly =
    targetCovered || hasTimelineError
      ? 0
      : Math.max(0, calculateRequiredMonthlyContribution(targetNum, startingNum, yearsNum, annReturnNum));
  const fvAffordable = calculateFutureValue(startingNum, affordableNum, yearsNum, annReturnNum);
  const monthlyGap = requiredMonthly - affordableNum;
  const shortfall = targetNum - fvAffordable;
  const totalContributedRequired = startingNum + requiredMonthly * Math.round(yearsNum * 12);
  const totalContributedAffordable = startingNum + affordableNum * Math.round(yearsNum * 12);

  const status: FeasibilityStatus = hasTimelineError
    ? "difficult"
    : calculateGoalFeasibility(requiredMonthly, affordableNum);

  const ss = statusStyles[status];

  const canUseAffordable = !hasTimelineError && (affordableNum > 0 || startingNum > 0);
  const canUseRequired = !hasTimelineError && requiredMonthly > 0;

  return (
    <PageLayout maxWidth="md">
      <PageHeader
        title="Goal Feasibility"
        description="Estimate the monthly contribution needed to reach a target amount within a specific timeframe."
        action={
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
        }
      />

      {/* Helper copy */}
      <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
        <p className="text-sm text-blue-700 leading-relaxed">
          This helps you understand whether a goal looks realistic based on your starting amount, estimated investing capacity, timeline, and return assumption.
        </p>
      </div>

      {/* No Money Snapshot data hint */}
      {!hasMoneySnapshotData && (
        <div className="mb-5 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            Complete <span className="font-medium text-slate-600">Money Snapshot</span> first for a more realistic affordability comparison. You can also enter numbers manually below.
          </p>
        </div>
      )}

      {/* A: Your Goal */}
      <div className="mb-5">
        <SectionHeader title="A. Your Goal" />
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Target portfolio value" hint="The total amount you are working toward.">
              <DollarInput value={target} onChange={setTarget} placeholder="1000000" />
            </Field>
            <Field label="Timeline (years)" hint="How many years you plan to invest before reaching this target.">
              <input
                type="number"
                min="1"
                max="50"
                value={years}
                onChange={(e) => setYears(e.target.value)}
                placeholder="15"
                className={`w-full px-4 py-2.5 border rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${hasTimelineError ? "border-red-300" : "border-slate-200"}`}
              />
              {hasTimelineError && (
                <p className="text-xs text-red-600 mt-1">Please enter a timeline greater than 0.</p>
              )}
            </Field>
          </div>
        </Card>
      </div>

      {/* B: Your Current Plan */}
      <div className="mb-8">
        <SectionHeader title="B. Your Current Plan" />
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Field label="Starting investment amount" hint={prefillStarting != null ? undefined : "Lump sum you are considering investing initially."}>
              <DollarInput value={starting} onChange={setStarting} />
              {prefillStarting != null && (
                <p className="text-xs text-blue-600 mt-1">Pre-filled from Money Snapshot</p>
              )}
            </Field>

            <Field label="Affordable monthly contribution" hint={prefillMonthly != null ? undefined : "What you could realistically contribute each month."}>
              <DollarInput value={affordable} onChange={setAffordable} />
              {prefillMonthly != null && (
                <p className="text-xs text-blue-600 mt-1">Pre-filled from Money Snapshot</p>
              )}
            </Field>

            <Field label="Annual return assumption">
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="30"
                  step="0.5"
                  value={annualReturn}
                  onChange={(e) => setAnnualReturn(e.target.value)}
                  placeholder="6"
                  className="w-full pr-7 pl-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">%</span>
              </div>
            </Field>

            <Field label={deriveProfile(answers) ? "Investor profile (from your quiz)" : "Investor profile"}>
              <select
                value={profile}
                onChange={(e) => {
                  const p = e.target.value as Profile;
                  setProfile(p);
                  setAnnualReturn(String(getDefaultReturn(p)));
                }}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              >
                {PROFILES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </Field>
          </div>

          {/* Scenario buttons */}
          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
            <p className="text-xs text-slate-400 font-medium">Return assumptions — not predictions</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Conservative — 4%", value: "4" },
                { label: "Moderate — 6%", value: "6" },
                { label: "Growth — 8%", value: "8" },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => setAnnualReturn(s.value)}
                  className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors cursor-pointer ${
                    annualReturn === s.value
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

      {/* Empty state */}
      {!showResults && targetNum === 0 && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-5 py-6 text-center mb-8">
          <p className="text-sm text-slate-500">
            Enter a target portfolio value above to see your goal feasibility estimate.
          </p>
        </div>
      )}

      {/* Results — Goal Feasibility Estimate */}
      {showResults && (
        <div className="space-y-5 mb-8">
          <SectionHeader
            title="Goal Feasibility Estimate"
            description="Based on the numbers entered — not a prediction or guarantee."
          />

          {/* Feasibility status */}
          <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${ss.bg} ${ss.border} ${ss.text}`}>
            {statusLabels[status]}
          </div>

          {/* Required monthly highlight */}
          <div className={`rounded-2xl border px-6 py-5 ${targetCovered ? `${statusStyles.covered.bg} ${statusStyles.covered.border}` : "bg-white border-slate-100 shadow-sm"}`}>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
              Required monthly contribution
            </p>
            {targetCovered ? (
              <p className={`text-sm font-semibold leading-relaxed ${statusStyles.covered.text}`}>
                {startingAlreadyCovers
                  ? "Your starting amount already meets or exceeds the target."
                  : "Your starting amount is projected to grow above the target — no additional monthly contributions needed."}
              </p>
            ) : (
              <>
                <p className="text-2xl font-bold text-slate-800">
                  {formatCurrency(requiredMonthly)}
                  <span className="text-base font-medium text-slate-400 ml-1">/month</span>
                </p>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Educational estimate based on the numbers entered. Not a recommendation.
                </p>
              </>
            )}
          </div>

          {/* Metrics grid */}
          <Card>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Target portfolio value</p>
                <p className="text-sm font-semibold text-slate-700">{formatCurrency(targetNum)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Timeline</p>
                <p className="text-sm font-semibold text-slate-700">{yearsNum} years</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Return assumption</p>
                <p className="text-sm font-semibold text-slate-700">{annReturnNum}%</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Starting investment</p>
                <p className="text-sm font-semibold text-slate-700">{formatCurrency(startingNum)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Affordable monthly</p>
                <p className="text-sm font-semibold text-slate-700">{formatCurrency(affordableNum)}</p>
              </div>
              {!targetCovered && (
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-400">
                    {monthlyGap <= 0 ? "Monthly surplus" : "Monthly gap"}
                  </p>
                  <p className={`text-sm font-semibold ${monthlyGap <= 0 ? "text-teal-700" : "text-rose-600"}`}>
                    {monthlyGap <= 0
                      ? `+${formatCurrency(Math.abs(monthlyGap))}`
                      : formatCurrency(monthlyGap)}
                  </p>
                </div>
              )}
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Est. value at affordable contribution</p>
                <p className="text-sm font-semibold text-slate-700">{formatCurrency(fvAffordable)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">
                  {shortfall <= 0 ? "Surplus vs target" : "Estimated shortfall"}
                </p>
                <p className={`text-sm font-semibold ${shortfall <= 0 ? "text-teal-700" : "text-amber-700"}`}>
                  {shortfall <= 0
                    ? `+${formatCurrency(Math.abs(shortfall))}`
                    : formatCurrency(shortfall)}
                </p>
              </div>
              {!targetCovered && (
                <>
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-400">Total contributed at required</p>
                    <p className="text-sm font-semibold text-slate-700">{formatCurrency(totalContributedRequired)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-400">Total contributed at affordable</p>
                    <p className="text-sm font-semibold text-slate-700">{formatCurrency(totalContributedAffordable)}</p>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Plain-English explanation */}
          <Card variant="muted" padding="sm">
            <p className="text-sm text-slate-600 leading-relaxed px-1">
              {statusExplanations[status]}
            </p>
          </Card>

          {/* Ways to explore the gap */}
          {monthlyGap > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                Ways to explore the gap
              </p>
              <Card variant="muted" padding="sm">
                <ul className="space-y-2.5 px-1">
                  {[
                    "Increase monthly contributions over time as income grows.",
                    "Extend the timeline to give contributions more time to compound.",
                    "Lower the target to a more achievable amount.",
                    "Increase the starting investment if you have savings above protected needs.",
                    "Test a different return assumption — higher assumptions involve more risk and are not guaranteed.",
                  ].map((item) => (
                    <li key={item} className="flex gap-2 items-start text-sm text-slate-600">
                      <span className="text-slate-300 shrink-0 mt-0.5">›</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          {/* What-if note */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              This is a what-if estimate based on your inputs. Real investment returns are not guaranteed and will not happen smoothly every year.
            </p>
          </div>

          {/* CTAs */}
          <div className="space-y-3 pt-1">
            {canUseAffordable ? (
              <Button variant="primary" fullWidth size="lg" onClick={() => {
                const plan: GoalPlan = {
                  targetAmount: targetNum,
                  timelineYears: yearsNum,
                  annualReturnAssumption: annReturnNum,
                  startingInvestmentAmount: startingNum,
                  affordableMonthlyContribution: affordableNum,
                  requiredMonthlyContribution: requiredMonthly,
                  monthlyGap,
                  estimatedFutureValueUsingAffordableContribution: fvAffordable,
                  shortfallOrSurplus: targetNum - fvAffordable,
                  feasibilityStatus: status,
                };
                onUseInSimulator(affordableNum, startingNum, plan);
              }}>
                Use this in Portfolio Simulator →
              </Button>
            ) : (
              <Card variant="muted" padding="sm">
                <p className="text-sm text-slate-500 px-1 text-center">
                  {targetCovered
                    ? "No monthly contribution needed — starting amount covers the target."
                    : "Enter a goal above to generate a feasibility estimate."}
                </p>
              </Card>
            )}
            {canUseRequired && (
              <button
                onClick={() => {
                  const plan: GoalPlan = {
                    targetAmount: targetNum,
                    timelineYears: yearsNum,
                    annualReturnAssumption: annReturnNum,
                    startingInvestmentAmount: startingNum,
                    affordableMonthlyContribution: affordableNum,
                    requiredMonthlyContribution: requiredMonthly,
                    monthlyGap,
                    estimatedFutureValueUsingAffordableContribution: fvAffordable,
                    shortfallOrSurplus: targetNum - fvAffordable,
                    feasibilityStatus: status,
                  };
                  onUseInSimulator(Math.round(requiredMonthly), startingNum, plan);
                }}
                className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer py-2 text-center"
              >
                Test required contribution ({formatCurrency(Math.round(requiredMonthly))}/month) in Portfolio Simulator
              </button>
            )}
          </div>
        </div>
      )}

      <Disclaimer extended="This is a what-if goal estimate based on assumptions, not a prediction or guarantee. Real investment returns vary and are not smooth. Always consult a licensed financial advisor before making investment decisions." />
    </PageLayout>
  );
}
