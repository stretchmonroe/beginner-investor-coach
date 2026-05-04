"use client";

import { useState } from "react";
import ETFDetailView from "./ETFDetailView";
import type { QuizAnswers } from "./OnboardingQuiz";

type RiskLevel = "Low" | "Medium" | "High";
type Filter = "All" | RiskLevel;
type Profile = "Conservative Beginner" | "Balanced Beginner" | "Growth Beginner";

export interface Etf {
  ticker: string;
  name: string;
  category: string;
  riskLevel: RiskLevel;
  bestFor: string;
  explanation: string;
  beginnerNote: string;
  whyFit: string;
  watchOut: string;
  questions: string[];
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
    whyFit:
      "It gives broad global stock exposure in one ETF, which makes it simpler than picking individual stocks.",
    watchOut:
      "It is 100% stocks, so it can drop significantly during market downturns.",
    questions: [
      "Is my timeline at least 10 years?",
      "Can I handle large short-term losses without panic-selling?",
      "Do I want a one-fund portfolio?",
    ],
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
    whyFit:
      "It is a simple all-equity portfolio with global diversification from Vanguard.",
    watchOut:
      "It has high stock exposure, so it is better suited for long-term investors.",
    questions: [
      "Am I investing for long-term growth and comfortable being fully invested in stocks?",
      "Do I understand that similar ETFs like XEQT can overlap?",
    ],
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
    whyFit:
      "It combines stocks and bonds, which can make it easier to hold through market swings than a 100% stock ETF.",
    watchOut:
      "It may grow slower than an all-equity ETF during strong stock markets.",
    questions: [
      "Do I want growth with some stability?",
      "Would a smoother ride help me stay invested?",
      "Am I okay with slightly lower upside than a 100% stock ETF?",
    ],
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
    whyFit:
      "It balances stocks and bonds, which can help reduce volatility for newer investors.",
    watchOut:
      "It may be too conservative if your timeline is very long and you want maximum growth.",
    questions: [
      "Do market drops make me nervous?",
      "Do I want a balanced mix instead of full stock exposure?",
      "Is stability important to me right now?",
    ],
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
    whyFit:
      "It can be useful for short-term savings or money you do not want exposed to stock market risk.",
    watchOut:
      "This ETF is not designed for long-term growth like stock ETFs.",
    questions: [
      "Do I need this money soon?",
      "Am I using this for savings instead of investing?",
      "Do I understand this is not a growth ETF?",
    ],
  },
];

// Fit label per profile per ticker
type FitLabel = { label: string; style: string };

const fitLabels: Record<Profile, Record<string, FitLabel>> = {
  "Conservative Beginner": {
    CASH: { label: "Strong fit", style: "bg-emerald-100 text-emerald-700" },
    VBAL: { label: "Good learning match", style: "bg-blue-100 text-blue-700" },
    VGRO: { label: "Higher risk", style: "bg-amber-100 text-amber-700" },
    XEQT: { label: "May be too aggressive", style: "bg-red-100 text-red-700" },
    VEQT: { label: "May be too aggressive", style: "bg-red-100 text-red-700" },
  },
  "Balanced Beginner": {
    VBAL: { label: "Strong fit", style: "bg-emerald-100 text-emerald-700" },
    VGRO: { label: "Strong fit", style: "bg-emerald-100 text-emerald-700" },
    CASH: { label: "Low-risk parking option", style: "bg-blue-100 text-blue-700" },
    XEQT: { label: "Higher growth option", style: "bg-amber-100 text-amber-700" },
    VEQT: { label: "Higher growth option", style: "bg-amber-100 text-amber-700" },
  },
  "Growth Beginner": {
    XEQT: { label: "Strong fit", style: "bg-emerald-100 text-emerald-700" },
    VEQT: { label: "Strong fit", style: "bg-emerald-100 text-emerald-700" },
    VGRO: { label: "Balanced alternative", style: "bg-blue-100 text-blue-700" },
    VBAL: { label: "More conservative", style: "bg-amber-100 text-amber-700" },
    CASH: { label: "Short-term savings only", style: "bg-slate-100 text-slate-600" },
  },
};

const defaultFit: FitLabel = { label: "Learning option", style: "bg-slate-100 text-slate-500" };

function deriveProfile(answers: QuizAnswers | null): Profile | null {
  if (!answers) return null;
  const riskScore =
    answers.risk === "I am comfortable with higher risk" ? 2
    : answers.risk === "I can handle some ups and downs" ? 1
    : 0;
  const timelineScore =
    answers.timeline === "10+ years" ? 2
    : answers.timeline === "3–10 years" ? 1
    : 0;
  const score = riskScore + timelineScore;
  if (score >= 3) return "Growth Beginner";
  if (score >= 1) return "Balanced Beginner";
  return "Conservative Beginner";
}

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
  answers: QuizAnswers | null;
  onBack: () => void;
}

export default function ETFExplorer({ answers, onBack }: Props) {
  const [filter, setFilter] = useState<Filter>("All");
  const [selected, setSelected] = useState<Etf | null>(null);

  const profile = deriveProfile(answers);
  const visible = filter === "All" ? ETFs : ETFs.filter((e) => e.riskLevel === filter);

  function getFit(ticker: string): FitLabel {
    if (!profile) return defaultFit;
    return fitLabels[profile][ticker] ?? defaultFit;
  }

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
          {profile
            ? `Based on your ${profile} profile, we'll highlight ETFs that may be easier for you to understand first. This is educational only and not financial advice.`
            : "These are examples of beginner-friendly ETF types to learn about first. This is educational only and not financial advice."}
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
        {visible.map((etf) => {
          const fit = getFit(etf.ticker);
          return (
            <button
              key={etf.ticker}
              onClick={() => setSelected(etf)}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-3 text-left hover:border-emerald-300 hover:shadow-md transition-all duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
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

              {/* Fit label */}
              <span className={`self-start text-xs font-semibold px-2.5 py-1 rounded-full ${fit.style}`}>
                {fit.label}
              </span>

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
            </button>
          );
        })}
      </div>

      {/* Detail modal */}
      {selected && (
        <ETFDetailView
          etf={selected}
          fitLabel={getFit(selected.ticker)}
          profile={profile}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
