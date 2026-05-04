"use client";

import { useState } from "react";
import ETFDetailView from "./ETFDetailView";
import type { QuizAnswers } from "./OnboardingQuiz";
import { ETFs, getFit, riskBadge, deriveProfile } from "@/lib/etfs";
import type { Etf } from "@/lib/etfs";

export type { Etf };

type RiskLevel = "Low" | "Medium" | "High";
type Filter = "All" | RiskLevel;

const FILTERS: Filter[] = ["All", "Low", "Medium", "High"];
const filterLabel: Record<Filter, string> = {
  All: "All",
  Low: "Low risk",
  Medium: "Medium risk",
  High: "High risk",
};

interface Props {
  answers: QuizAnswers | null;
  watchedTickers: Set<string>;
  onSave: (etf: Etf) => void;
  onRemove: (ticker: string) => void;
  onViewWatchlist: () => void;
  onCompare: () => void;
  onSimulate: () => void;
  onAskCoach: () => void;
  onBack: () => void;
}

export default function ETFExplorer({
  answers,
  watchedTickers,
  onSave,
  onRemove,
  onViewWatchlist,
  onCompare,
  onSimulate,
  onAskCoach,
  onBack,
}: Props) {
  const [filter, setFilter] = useState<Filter>("All");
  const [selected, setSelected] = useState<Etf | null>(null);

  const profile = deriveProfile(answers);
  const visible = filter === "All" ? ETFs : ETFs.filter((e) => e.riskLevel === filter);

  return (
    <main className="min-h-screen px-6 py-14 max-w-5xl mx-auto">
      {/* Top nav */}
      <div className="flex items-center justify-between mb-8 gap-4">
        <button
          onClick={onBack}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer shrink-0"
        >
          ← Back to results
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={onAskCoach}
            className="text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            ✦ Ask Coach
          </button>
          <button
            onClick={onSimulate}
            className="text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            ⊞ Simulator
          </button>
          <button
            onClick={onCompare}
            className="text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
          >
            ⇄ Compare
          </button>
          <button
            onClick={onViewWatchlist}
            className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:text-emerald-800 transition-colors cursor-pointer"
          >
            ☆ Watchlist
            {watchedTickers.size > 0 && (
              <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {watchedTickers.size}
              </span>
            )}
          </button>
        </div>
      </div>

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
          const fit = getFit(etf.ticker, profile);
          const saved = watchedTickers.has(etf.ticker);
          return (
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

              {/* Footer: note + save button */}
              <div className="mt-auto pt-3 border-t border-slate-100 flex items-end justify-between gap-3">
                <p className="text-xs text-slate-400 leading-relaxed">
                  <span className="font-semibold text-slate-500">Beginner note: </span>
                  {etf.beginnerNote}
                </p>
                <button
                  onClick={() => saved ? onRemove(etf.ticker) : onSave(etf)}
                  className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer
                    ${saved
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      : "bg-white text-slate-600 border-slate-200 hover:border-emerald-300 hover:text-emerald-700"
                    }`}
                >
                  {saved ? "Saved ✓" : "Save"}
                </button>
              </div>

              {/* View details */}
              <button
                onClick={() => setSelected(etf)}
                className="text-xs text-emerald-600 hover:text-emerald-800 font-medium text-left cursor-pointer transition-colors"
              >
                View details →
              </button>
            </div>
          );
        })}
      </div>

      {/* Detail modal */}
      {selected && (
        <ETFDetailView
          etf={selected}
          fitLabel={getFit(selected.ticker, profile)}
          profile={profile}
          isSaved={watchedTickers.has(selected.ticker)}
          onSave={() => onSave(selected)}
          onRemove={() => onRemove(selected.ticker)}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
