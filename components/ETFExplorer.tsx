"use client";

import { useState } from "react";

type RiskLevel = "Low" | "Medium" | "High";
type Filter = "All" | RiskLevel;

interface Etf {
  ticker: string;
  name: string;
  category: string;
  riskLevel: RiskLevel;
  bestFor: string;
  explanation: string;
  beginnerNote: string;
}

const ETFs: Etf[] = [
  {
    ticker: "XEQT",
    name: "iShares Core Equity ETF Portfolio",
    category: "All-in-one equity ETF",
    riskLevel: "High",
    bestFor: "Long-term growth investors",
    explanation:
      "A globally diversified all-equity ETF that gives beginners exposure to thousands of companies in one fund.",
    beginnerNote:
      "Good for people with a long timeline who can handle market ups and downs.",
  },
  {
    ticker: "VEQT",
    name: "Vanguard All-Equity ETF Portfolio",
    category: "All-in-one equity ETF",
    riskLevel: "High",
    bestFor: "Long-term growth investors",
    explanation:
      "A simple one-fund portfolio with global stock exposure across Canada, the U.S., and international markets.",
    beginnerNote:
      "Similar to XEQT. Useful for beginners who want broad diversification without picking individual stocks.",
  },
  {
    ticker: "VGRO",
    name: "Vanguard Growth ETF Portfolio",
    category: "All-in-one growth ETF",
    riskLevel: "Medium",
    bestFor: "Balanced growth investors",
    explanation:
      "A diversified ETF with mostly stocks and some bonds, designed for growth with slightly less volatility than an all-equity ETF.",
    beginnerNote:
      "Good for people who want growth but do not want to be 100% in stocks.",
  },
  {
    ticker: "VBAL",
    name: "Vanguard Balanced ETF Portfolio",
    category: "Balanced ETF",
    riskLevel: "Medium",
    bestFor: "Moderate investors",
    explanation:
      "A balanced ETF with a mix of stocks and bonds, built for people who want growth but also want more stability.",
    beginnerNote: "Good for beginners who feel nervous about big market swings.",
  },
  {
    ticker: "CASH",
    name: "Global X High Interest Savings ETF",
    category: "Cash / savings ETF",
    riskLevel: "Low",
    bestFor: "Short-term savings",
    explanation:
      "A low-risk ETF designed to generate interest-like income while keeping money relatively stable.",
    beginnerNote:
      "Better suited for short-term goals or money you do not want exposed to stock market risk.",
  },
];

const riskBadge: Record<RiskLevel, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
};

const FILTERS: Filter[] = ["All", "Low", "Medium", "High"];
const filterLabel: Record<Filter, string> = {
  All: "All",
  Low: "Low risk",
  Medium: "Medium risk",
  High: "High risk",
};

interface Props {
  onBack: () => void;
}

export default function ETFExplorer({ onBack }: Props) {
  const [filter, setFilter] = useState<Filter>("All");

  const visible = filter === "All" ? ETFs : ETFs.filter((e) => e.riskLevel === filter);

  return (
    <main className="min-h-screen px-6 py-14 max-w-5xl mx-auto">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer mb-8 inline-block"
      >
        ← Back to results
      </button>

      {/* Header */}
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Explore beginner ETFs</h1>
        <p className="text-slate-500 text-sm leading-relaxed max-w-xl">
          These are examples of beginner-friendly ETF types to learn about first.
          This is educational only and not financial advice.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer border
              ${filter === f
                ? "bg-emerald-600 text-white border-emerald-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
              }`}
          >
            {filterLabel[f]}
          </button>
        ))}
      </div>

      {/* ETF grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {visible.map((etf) => (
          <div
            key={etf.ticker}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-3"
          >
            {/* Ticker + risk badge */}
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-emerald-700">{etf.ticker}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${riskBadge[etf.riskLevel]}`}>
                {etf.riskLevel} risk
              </span>
            </div>

            {/* Name + category */}
            <div>
              <p className="text-sm font-semibold text-slate-800 leading-snug">{etf.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{etf.category}</p>
            </div>

            {/* Best for */}
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-600">Best for: </span>
              {etf.bestFor}
            </p>

            {/* Explanation */}
            <p className="text-sm text-slate-600 leading-relaxed">{etf.explanation}</p>

            {/* Beginner note */}
            <div className="mt-auto pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400 leading-relaxed">
                <span className="font-semibold text-slate-500">Beginner note: </span>
                {etf.beginnerNote}
              </p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
