"use client";

import { useState } from "react";
import { ETFs, riskBadge, deriveProfile } from "@/lib/etfs";
import type { QuizAnswers } from "./OnboardingQuiz";
import type { Profile } from "@/lib/etfs";

interface AllocationItem {
  ticker: string;
  pct: number;
  role: string;
}

const allocations: Record<Profile, AllocationItem[]> = {
  "Conservative Beginner": [
    { ticker: "VBAL", pct: 50, role: "Balanced stability and growth" },
    { ticker: "CASH", pct: 30, role: "Short-term stability / cash parking" },
    { ticker: "VGRO", pct: 20, role: "Growth with some stability" },
  ],
  "Balanced Beginner": [
    { ticker: "VGRO", pct: 50, role: "Growth with some stability" },
    { ticker: "VBAL", pct: 30, role: "Balanced stability and growth" },
    { ticker: "XEQT", pct: 20, role: "Long-term growth engine" },
  ],
  "Growth Beginner": [
    { ticker: "XEQT", pct: 60, role: "Long-term growth engine" },
    { ticker: "VGRO", pct: 30, role: "Growth with some stability" },
    { ticker: "CASH", pct: 10, role: "Short-term stability / cash parking" },
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

const PROFILES: Profile[] = [
  "Conservative Beginner",
  "Balanced Beginner",
  "Growth Beginner",
];
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

interface Props {
  answers: QuizAnswers | null;
  onBack: () => void;
}

export default function PortfolioSimulator({ answers, onBack }: Props) {
  const derivedProfile = deriveProfile(answers);

  const [startingAmount, setStartingAmount] = useState("0");
  const [monthlyContribution, setMonthlyContribution] = useState("500");
  const [timeline, setTimeline] = useState<Timeline>(
    (answers?.timeline as Timeline) ?? "10+ years"
  );
  const [profile, setProfile] = useState<Profile>(
    derivedProfile ?? "Balanced Beginner"
  );

  const starting = clamp(startingAmount);
  const monthly = clamp(monthlyContribution);
  const items = allocations[profile];

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
          </div>

          {/* Monthly contribution */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700">Monthly contribution</label>
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

      {/* Timeline warning */}
      <div className={`rounded-xl border px-5 py-3.5 mb-8 text-sm leading-relaxed ${timelineWarnStyle[timeline]}`}>
        {timelineWarning[timeline]}
      </div>

      {/* Allocation table */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
          Sample learning allocation — {profile}
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                <th className="text-left px-5 py-3">ETF</th>
                <th className="text-left px-5 py-3">%</th>
                <th className="text-right px-5 py-3">Starting</th>
                <th className="text-right px-5 py-3">Monthly</th>
                <th className="text-left px-5 py-3 hidden sm:table-cell">Risk</th>
                <th className="text-left px-5 py-3 hidden sm:table-cell">Role</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => {
                const etf = ETFs.find((e) => e.ticker === item.ticker);
                const startAlloc = Math.round(starting * item.pct) / 100;
                const monthlyAlloc = Math.round(monthly * item.pct) / 100;
                return (
                  <tr
                    key={item.ticker}
                    className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                  >
                    {/* Ticker + name */}
                    <td className="px-5 py-4 align-top">
                      <span className="font-bold text-emerald-700">{item.ticker}</span>
                      {etf && (
                        <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">{etf.name}</p>
                      )}
                    </td>
                    {/* Allocation % */}
                    <td className="px-5 py-4 align-top">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-slate-100 rounded-full h-1.5">
                          <div
                            className="bg-emerald-500 h-1.5 rounded-full"
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                        <span className="text-slate-700 font-medium">{item.pct}%</span>
                      </div>
                    </td>
                    {/* Starting allocation */}
                    <td className="px-5 py-4 align-top text-right text-slate-700 font-medium">
                      {starting > 0 ? fmt(startAlloc) : "—"}
                    </td>
                    {/* Monthly allocation */}
                    <td className="px-5 py-4 align-top text-right text-slate-700 font-medium">
                      {monthly > 0 ? fmt(monthlyAlloc) : "—"}
                    </td>
                    {/* Risk */}
                    <td className="px-5 py-4 align-top hidden sm:table-cell">
                      {etf && (
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${riskBadge[etf.riskLevel]}`}>
                          {etf.riskLevel}
                        </span>
                      )}
                    </td>
                    {/* Role */}
                    <td className="px-5 py-4 align-top text-slate-500 text-xs hidden sm:table-cell">
                      {item.role}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Totals row */}
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
      </div>

      {/* Plain-English explanation */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-6 space-y-2">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          What this sample allocation means
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed">
          {profileExplanation[profile]}
        </p>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl bg-slate-100 border border-slate-200 px-5 py-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-600">Educational only. Not financial advice. </span>
          This is a sample learning allocation, not a recommendation to buy. Past performance does not predict future results. Always consult a licensed financial advisor before making investment decisions.
        </p>
      </div>
    </main>
  );
}
