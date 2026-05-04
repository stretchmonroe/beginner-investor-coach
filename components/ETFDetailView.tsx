"use client";

import { useState } from "react";
import type { Etf } from "@/lib/etfs";
import CoachExplanation from "./CoachExplanation";
import MarketSnapshot from "./MarketSnapshot";
import { etfExplanations } from "@/lib/coachExplanations";

type Profile = "Conservative Beginner" | "Balanced Beginner" | "Growth Beginner";
type FitLabel = { label: string; style: string };

const riskBadge: Record<string, string> = {
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
};

interface Props {
  etf: Etf;
  fitLabel: FitLabel;
  profile: Profile | null;
  isSaved: boolean;
  onSave: () => void;
  onRemove: () => void;
  onClose: () => void;
}

export default function ETFDetailView({
  etf,
  fitLabel,
  profile,
  isSaved,
  onSave,
  onRemove,
  onClose,
}: Props) {
  const [showCoach, setShowCoach] = useState(false);
  const coachContent = etfExplanations[etf.ticker];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-6 py-0 sm:py-10"
      onClick={onClose}
    >
      <div
        className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-xl max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-1"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>

        <div className="p-7 space-y-6">
          {/* Header */}
          <div className="space-y-1 pr-6">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-3xl font-bold text-emerald-700">{etf.ticker}</span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${riskBadge[etf.riskLevel]}`}>
                {etf.riskLevel} risk
              </span>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${fitLabel.style}`}>
                {fitLabel.label}
              </span>
            </div>
            <p className="text-base font-semibold text-slate-800">{etf.name}</p>
            <p className="text-xs text-slate-400">{etf.category} · Best for: {etf.bestFor}</p>
          </div>

          {/* Market Snapshot */}
          <MarketSnapshot ticker={etf.ticker} />

          {/* Explanation */}
          <p className="text-sm text-slate-600 leading-relaxed">{etf.explanation}</p>

          {/* Beginner note */}
          <div className="bg-slate-50 rounded-xl px-4 py-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-600">Beginner note: </span>
              {etf.beginnerNote}
            </p>
          </div>

          {/* Personalized fit */}
          {profile && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Why this might fit you
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">{etf.whyFit}</p>
            </div>
          )}

          {/* Watch out */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              What to watch out for
            </h3>
            <p className="text-sm text-slate-700 leading-relaxed">{etf.watchOut}</p>
          </div>

          {/* Questions */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Questions to ask before buying
            </h3>
            <ul className="space-y-2">
              {etf.questions.map((q) => (
                <li key={q} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-emerald-500 mt-0.5 shrink-0">›</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Coach explanation */}
          {coachContent && (
            <div className="space-y-3">
              {!showCoach ? (
                <button
                  onClick={() => setShowCoach(true)}
                  className="w-full py-2.5 rounded-xl text-sm font-medium border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                >
                  ✦ Explain this like I&apos;m new
                </button>
              ) : (
                <CoachExplanation content={coachContent} onClose={() => setShowCoach(false)} />
              )}
            </div>
          )}

          {/* Save to watchlist */}
          <button
            onClick={isSaved ? onRemove : onSave}
            className={`w-full py-3 rounded-xl text-sm font-semibold border transition-colors cursor-pointer
              ${isSaved
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                : "bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700"
              }`}
          >
            {isSaved ? "Saved to watchlist ✓ — tap to remove" : "Save to Watchlist"}
          </button>

          {/* Disclaimer */}
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              <span className="font-semibold text-slate-500">Educational only. </span>
              Not financial advice. Always consult a licensed financial advisor before making investment decisions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
