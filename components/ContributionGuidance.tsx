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
    "This estimate assumes you may be comfortable investing more of your surplus, but only after bills, debt, and emergency savings are accounted for.",
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

function calculateMonthlySurplus(
  takeHome: number,
  bills: number,
  debt: number,
  emergency: number
): number {
  return Math.max(0, takeHome - bills - debt - emergency);
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

interface Props {
  answers: QuizAnswers | null;
  onBack: () => void;
  onUseInSimulator: (amount: number) => void;
  onGuidanceResult?: (snapshot: ContributionGuidanceSnapshot) => void;
}

export default function ContributionGuidance({ answers, onBack, onUseInSimulator, onGuidanceResult }: Props) {
  const derivedProfile = deriveProfile(answers);

  const [takeHome, setTakeHome] = useState("");
  const [bills, setBills] = useState("");
  const [debt, setDebt] = useState("0");
  const [emergencySavings, setEmergencySavings] = useState("0");
  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyStatus>("Not started");
  const [profile, setProfile] = useState<Profile>(derivedProfile ?? "Balanced Beginner");

  const takeHomeNum = clampInput(takeHome);
  const billsNum = clampInput(bills);
  const debtNum = clampInput(debt);
  const emergencySavingsNum = clampInput(emergencySavings);

  const hasIncome = takeHomeNum > 0;
  const surplus = calculateMonthlySurplus(takeHomeNum, billsNum, debtNum, emergencySavingsNum);
  const billsPct = takeHomeNum > 0 ? (billsNum / takeHomeNum) * 100 : 0;
  const debtPct = takeHomeNum > 0 ? (debtNum / takeHomeNum) * 100 : 0;
  const { low, high, notes } = calculateContributionRange(
    surplus,
    profile,
    emergencyStatus,
    billsPct,
    debtPct
  );

  const midpoint = roundToNearest25((low + high) / 2);
  const hasRange = high > 0;

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
          Enter your monthly numbers to get an educational estimate of how much you might consider investing each month.
          This is not financial advice.
        </p>
      </div>

      {/* Inputs */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6 space-y-5">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Your monthly numbers</h2>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Monthly take-home pay</label>
          <p className="text-xs text-slate-400">After tax, the amount that hits your bank account each month.</p>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number" min="0" value={takeHome}
              onChange={(e) => setTakeHome(e.target.value)}
              placeholder="0"
              className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Monthly bills / fixed expenses</label>
          <p className="text-xs text-slate-400">Rent, utilities, subscriptions, insurance, groceries, and similar regular expenses.</p>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number" min="0" value={bills}
              onChange={(e) => setBills(e.target.value)}
              placeholder="0"
              className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Monthly debt payments</label>
          <p className="text-xs text-slate-400">Credit cards, student loans, car payments, or other debt obligations.</p>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number" min="0" value={debt}
              onChange={(e) => setDebt(e.target.value)}
              placeholder="0"
              className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Monthly emergency savings contribution</label>
          <p className="text-xs text-slate-400">Amount you set aside each month toward your emergency fund, if any.</p>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
            <input
              type="number" min="0" value={emergencySavings}
              onChange={(e) => setEmergencySavings(e.target.value)}
              placeholder="0"
              className="w-full pl-7 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
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

      {/* Empty state */}
      {!hasIncome && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-5 py-6 text-center">
          <p className="text-sm text-slate-500">Enter your monthly take-home pay above to see your estimated contribution range.</p>
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

            <div className="grid grid-cols-2 gap-4 text-sm">
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
                <p className="text-xs text-slate-400">Estimated monthly surplus</p>
                <p className={`font-semibold ${surplus <= 0 ? "text-red-600" : "text-slate-700"}`}>
                  {fmt(surplus)}
                </p>
              </div>
            </div>

            {/* Contribution range highlight */}
            <div className={`rounded-xl px-5 py-4 border ${surplus <= 0 ? "bg-red-50 border-red-200" : "bg-white border-emerald-200"}`}>
              <p className="text-xs text-slate-400 mb-1">Estimated contribution range to consider</p>
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
          </div>

          {/* Profile guidance */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <p className="text-xs text-emerald-800 leading-relaxed">
              <span className="font-semibold">For {profile}s: </span>
              {profileGuidanceText[profile]}
            </p>
          </div>

          {/* Use in simulator */}
          {hasRange ? (
            <button
              onClick={() => {
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
                });
                onUseInSimulator(midpoint);
              }}
              className="w-full py-3 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer"
            >
              Use {fmt(midpoint)}/month in Portfolio Simulator →
            </button>
          ) : (
            <div className="rounded-xl bg-slate-100 border border-slate-200 px-5 py-4">
              <p className="text-sm text-slate-500">
                Try adjusting your numbers or focus on building monthly surplus first before using the simulator.
              </p>
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
