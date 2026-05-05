"use client";

import { useState } from "react";
import type { QuizAnswers } from "./OnboardingQuiz";
import { deriveProfile } from "@/lib/etfs";
import type { Profile } from "@/lib/etfs";

const PROFILES: Profile[] = ["Conservative Beginner", "Balanced Beginner", "Growth Beginner"];

function getDefaultReturn(p: Profile): number {
  if (p === "Conservative Beginner") return 4;
  if (p === "Balanced Beginner") return 6;
  return 8;
}

function fv(starting: number, monthly: number, years: number, annualReturnPct: number): number {
  const months = Math.round(years * 12);
  if (annualReturnPct === 0 || months === 0) return starting + monthly * months;
  const r = annualReturnPct / 100 / 12;
  return starting * Math.pow(1 + r, months) + monthly * ((Math.pow(1 + r, months) - 1) / r);
}

function calculateRequiredMonthly(
  target: number,
  starting: number,
  years: number,
  annualReturnPct: number
): number {
  const months = Math.round(years * 12);
  if (months === 0) return 0;
  const r = annualReturnPct / 100 / 12;
  const fvStarting = annualReturnPct === 0 ? starting : starting * Math.pow(1 + r, months);
  const remaining = target - fvStarting;
  if (remaining <= 0) return 0;
  if (annualReturnPct === 0) return remaining / months;
  return remaining * r / (Math.pow(1 + r, months) - 1);
}

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
      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
      <input
        type="number"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />
    </div>
  );
}

interface Props {
  answers: QuizAnswers | null;
  prefillMonthly?: number | null;
  prefillStarting?: number | null;
  onBack: () => void;
  onUseInSimulator: (monthly: number, starting: number) => void;
}

export default function GoalPlanner({
  answers,
  prefillMonthly,
  prefillStarting,
  onBack,
  onUseInSimulator,
}: Props) {
  const derivedProfile = deriveProfile(answers) ?? "Balanced Beginner";

  const [target, setTarget] = useState("1000000");
  const [starting, setStarting] = useState(prefillStarting != null ? String(prefillStarting) : "0");
  const [years, setYears] = useState("15");
  const [annualReturn, setAnnualReturn] = useState(String(getDefaultReturn(derivedProfile)));
  const [affordable, setAffordable] = useState(prefillMonthly != null ? String(prefillMonthly) : "500");
  const [profile, setProfile] = useState<Profile>(derivedProfile);

  const targetNum = clamp(target);
  const startingNum = clamp(starting);
  const yearsNum = Math.min(Math.max(clamp(years), 0), 50);
  const annReturnNum = Math.min(Math.max(clamp(annualReturn), 0), 30);
  const affordableNum = clamp(affordable);

  const hasTimelineError = yearsNum === 0;
  const showResults = targetNum > 0 && !hasTimelineError;

  // Future value of starting amount alone at end of timeline
  const fvOfStarting = (() => {
    if (yearsNum === 0 || annReturnNum === 0) return startingNum;
    const months = Math.round(yearsNum * 12);
    const r = annReturnNum / 100 / 12;
    return startingNum * Math.pow(1 + r, months);
  })();

  const startingAlreadyCovers = targetNum > 0 && startingNum >= targetNum;
  const growthCoversTarget = targetNum > 0 && !startingAlreadyCovers && fvOfStarting >= targetNum;
  const targetCovered = startingAlreadyCovers || growthCoversTarget;

  const requiredMonthly = targetCovered || hasTimelineError
    ? 0
    : calculateRequiredMonthly(targetNum, startingNum, yearsNum, annReturnNum);

  const fvAffordable = fv(startingNum, affordableNum, yearsNum, annReturnNum);
  const monthlyGap = requiredMonthly - affordableNum;
  const shortfall = targetNum - fvAffordable;
  const totalContributedRequired = startingNum + requiredMonthly * Math.round(yearsNum * 12);
  const totalContributedAffordable = startingNum + affordableNum * Math.round(yearsNum * 12);

  type Status = "covered" | "on-track" | "close" | "difficult";

  function getStatus(): Status {
    if (targetCovered) return "covered";
    if (monthlyGap <= 0) return "on-track";
    if (requiredMonthly > 0 && monthlyGap <= 0.25 * requiredMonthly) return "close";
    return "difficult";
  }

  const status = hasTimelineError ? "difficult" : getStatus();

  const statusConfig: Record<Status, { label: string; style: string }> = {
    covered: {
      label: "Target already covered by starting amount",
      style: "bg-emerald-50 border-emerald-200 text-emerald-700",
    },
    "on-track": {
      label: "On track based on assumptions",
      style: "bg-emerald-50 border-emerald-200 text-emerald-700",
    },
    close: {
      label: "Close, but may need adjustment",
      style: "bg-amber-50 border-amber-200 text-amber-700",
    },
    difficult: {
      label: "Likely difficult based on current contribution",
      style: "bg-red-50 border-red-200 text-red-700",
    },
  };

  const canUseInSimulator = requiredMonthly > 0 && !hasTimelineError;

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
        <h1 className="text-3xl font-bold text-slate-900">Goal Planner</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          Work backward from a target portfolio value to estimate the monthly contribution you would need.
          This is a what-if calculator based on assumptions — not a prediction or financial advice.
        </p>
      </div>

      {/* Inputs card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6 space-y-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Goal inputs</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Target */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Target portfolio value</label>
            <DollarInput value={target} onChange={setTarget} placeholder="1000000" />
          </div>

          {/* Starting */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Starting investment amount</label>
            <DollarInput value={starting} onChange={setStarting} />
            {prefillStarting != null && (
              <p className="text-xs text-emerald-600">Pre-filled from Portfolio Simulator</p>
            )}
          </div>

          {/* Timeline */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Timeline (years)</label>
            <input
              type="number"
              min="1"
              max="50"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              placeholder="15"
              className={`w-full px-4 py-2.5 border rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                hasTimelineError ? "border-red-300" : "border-slate-200"
              }`}
            />
            {hasTimelineError && (
              <p className="text-xs text-red-600">Please enter a timeline greater than 0.</p>
            )}
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
                placeholder="6"
                className="w-full pr-7 pl-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
            </div>
          </div>

          {/* Affordable monthly */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Affordable monthly contribution</label>
            <p className="text-xs text-slate-400">What you could realistically contribute each month.</p>
            <DollarInput value={affordable} onChange={setAffordable} />
            {prefillMonthly != null && (
              <p className="text-xs text-emerald-600">Pre-filled from Contribution Guidance</p>
            )}
          </div>

          {/* Profile */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">
              Investor profile
              {deriveProfile(answers) && (
                <span className="ml-2 text-xs font-normal text-emerald-600">(from your quiz)</span>
              )}
            </label>
            <select
              value={profile}
              onChange={(e) => {
                const p = e.target.value as Profile;
                setProfile(p);
                setAnnualReturn(String(getDefaultReturn(p)));
              }}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 cursor-pointer"
            >
              {PROFILES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Scenario buttons */}
        <div className="space-y-2 pt-1">
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

      {/* Results */}
      {showResults ? (
        <div className="space-y-5">
          {/* Feasibility badge */}
          <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${statusConfig[status].style}`}>
            {statusConfig[status].label}
          </div>

          {/* Results card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Goal estimate results
            </h2>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Target portfolio value</p>
                <p className="font-semibold text-slate-700">{fmt(targetNum)}</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Timeline</p>
                <p className="font-semibold text-slate-700">{yearsNum} years</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Annual return assumption</p>
                <p className="font-semibold text-slate-700">{annReturnNum}%</p>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-slate-400">Starting investment</p>
                <p className="font-semibold text-slate-700">{fmt(startingNum)}</p>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-4">
              {/* Required monthly highlight */}
              <div className="bg-white border border-emerald-200 rounded-xl px-5 py-4">
                <p className="text-xs text-slate-400 mb-0.5">Required monthly contribution</p>
                {targetCovered ? (
                  <p className="text-sm font-semibold text-emerald-700">
                    {startingAlreadyCovers
                      ? "Your starting amount already meets or exceeds the target."
                      : "Your starting amount is projected to grow above the target — no additional contributions needed."}
                  </p>
                ) : (
                  <p className="text-2xl font-bold text-emerald-700">
                    {fmt(requiredMonthly)}
                    <span className="text-sm font-medium text-slate-500">/month</span>
                  </p>
                )}
              </div>

              {/* Comparison grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-400">Affordable monthly</p>
                  <p className="font-semibold text-slate-700">{fmt(affordableNum)}</p>
                </div>
                {!targetCovered && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-slate-400">
                      {monthlyGap <= 0 ? "Monthly surplus" : "Monthly gap"}
                    </p>
                    <p className={`font-semibold ${monthlyGap <= 0 ? "text-emerald-700" : "text-red-600"}`}>
                      {monthlyGap <= 0
                        ? `+${fmt(Math.abs(monthlyGap))}`
                        : fmt(monthlyGap)}
                    </p>
                  </div>
                )}
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-400">Est. value at affordable contribution</p>
                  <p className="font-semibold text-slate-700">{fmt(fvAffordable)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs text-slate-400">
                    {shortfall <= 0 ? "Surplus vs target" : "Estimated shortfall"}
                  </p>
                  <p className={`font-semibold ${shortfall <= 0 ? "text-emerald-700" : "text-amber-700"}`}>
                    {shortfall <= 0
                      ? `+${fmt(Math.abs(shortfall))}`
                      : fmt(shortfall)}
                  </p>
                </div>
                {!targetCovered && (
                  <>
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-400">Total contributed at required</p>
                      <p className="font-semibold text-slate-700">{fmt(totalContributedRequired)}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-xs text-slate-400">Total contributed at affordable</p>
                      <p className="font-semibold text-slate-700">{fmt(totalContributedAffordable)}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Affordability message */}
          {!targetCovered && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                monthlyGap <= 0
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              {monthlyGap <= 0
                ? "Based on these assumptions, your estimated monthly contribution capacity could support this goal."
                : `Based on these assumptions, there is a monthly gap of approximately ${fmt(monthlyGap)}.`}
            </div>
          )}

          {/* Gap adjustment suggestions */}
          {monthlyGap > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-4 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Ways to close the gap
              </p>
              <ul className="space-y-1.5 text-sm text-slate-600">
                <li className="flex gap-2 items-start">
                  <span className="text-slate-400 shrink-0 mt-0.5">•</span>
                  Increase monthly contributions over time as income grows.
                </li>
                <li className="flex gap-2 items-start">
                  <span className="text-slate-400 shrink-0 mt-0.5">•</span>
                  Extend the timeline to give contributions more time to compound.
                </li>
                <li className="flex gap-2 items-start">
                  <span className="text-slate-400 shrink-0 mt-0.5">•</span>
                  Lower the target to a more achievable amount.
                </li>
                <li className="flex gap-2 items-start">
                  <span className="text-slate-400 shrink-0 mt-0.5">•</span>
                  Increase the starting investment if you have savings above protected needs.
                </li>
                <li className="flex gap-2 items-start">
                  <span className="text-slate-400 shrink-0 mt-0.5">•</span>
                  Explore different return assumptions — higher assumptions involve more risk and are not guaranteed.
                </li>
              </ul>
            </div>
          )}

          {/* Plain-English explanation */}
          <div className="bg-white border border-slate-100 rounded-xl px-5 py-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              This calculator works backward from your target amount, timeline, starting investment, and return assumption to estimate the monthly contribution needed. Real returns are not guaranteed and will not happen smoothly every year.
            </p>
          </div>

          {/* Simulator button */}
          {canUseInSimulator ? (
            <button
              onClick={() => onUseInSimulator(Math.round(requiredMonthly), startingNum)}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Use {fmt(Math.round(requiredMonthly))}/month in Portfolio Simulator →
            </button>
          ) : (
            <div className="rounded-xl bg-slate-100 border border-slate-200 px-5 py-3 text-center">
              <p className="text-sm text-slate-500">
                {targetCovered
                  ? "No monthly contribution needed — starting amount covers the target."
                  : "Enter a goal above to generate a required monthly contribution."}
              </p>
            </div>
          )}
        </div>
      ) : (
        targetNum === 0 && (
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-5 py-6 text-center">
            <p className="text-sm text-slate-500">
              Enter a target portfolio value above to see your goal estimate.
            </p>
          </div>
        )
      )}

      {/* Disclaimer */}
      <div className="mt-8 rounded-xl bg-slate-100 border border-slate-200 px-5 py-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-600">Educational only. Not financial advice. </span>
          This is a what-if goal estimate based on assumptions, not a prediction or guarantee. Real investment returns vary and are not smooth. Always consult a licensed financial advisor before making investment decisions.
        </p>
      </div>
    </main>
  );
}
