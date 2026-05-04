"use client";

import { useState } from "react";
import { ETFs, getFit, riskBadge, deriveProfile } from "@/lib/etfs";
import type { QuizAnswers } from "./OnboardingQuiz";
import type { Etf, Profile } from "@/lib/etfs";
import CoachExplanation from "./CoachExplanation";
import { comparisonExplanations, genericCoachContent } from "@/lib/coachExplanations";

const compareSummaries: Record<string, string> = {
  "CASH-VBAL":
    "VBAL is a balanced investment ETF with stocks and bonds. CASH is much lower risk and better suited for short-term savings, but it has less long-term growth potential.",
  "CASH-VGRO":
    "VGRO is an investment ETF for growth with some stability. CASH is mainly for short-term savings and capital preservation.",
  "CASH-VEQT":
    "VEQT is built for long-term investing. CASH is more like a savings-style ETF and is not designed for long-term growth.",
  "CASH-XEQT":
    "XEQT is for long-term growth and can move up and down a lot. CASH is better for short-term savings or money you do not want exposed to stock market risk.",
  "VBAL-VGRO":
    "VGRO leans more toward growth because it has more stock exposure. VBAL is more conservative because it has a larger bond allocation.",
  "VBAL-VEQT":
    "VEQT is more aggressive and focused on growth. VBAL is more balanced and may be easier to hold if market drops make you nervous.",
  "VBAL-XEQT":
    "XEQT is focused on long-term growth with higher volatility. VBAL is more balanced and may feel more stable for newer or more cautious investors.",
  "VGRO-VEQT":
    "VEQT is an all-equity ETF for long-term growth. VGRO has some bonds, so it may be a better fit for someone who wants growth with slightly less volatility.",
  "VGRO-XEQT":
    "XEQT is more aggressive because it is 100% stocks. VGRO includes some bonds, which may make it easier to hold during market downturns.",
  "VEQT-XEQT":
    "XEQT and VEQT are very similar. Both are all-equity ETFs with broad global diversification. A beginner likely does not need both because they overlap heavily.",
};

const profileGuidance: Record<Profile, string> = {
  "Conservative Beginner":
    "You may want to focus first on ETFs with lower volatility and easier-to-understand risk.",
  "Balanced Beginner":
    "You may want to compare how much growth you want versus how much volatility you can realistically handle.",
  "Growth Beginner":
    "You may be more comfortable with equity-heavy ETFs, but it is still important to understand overlap and downside risk.",
};

function getSummary(a: string, b: string): string {
  const key = [a, b].sort().join("-");
  return compareSummaries[key] ?? "These ETFs serve different purposes. Compare their risk level, time horizon, and role in a beginner portfolio before deciding whether either one fits your plan.";
}

interface Props {
  answers: QuizAnswers | null;
  watchedTickers: Set<string>;
  onBack: () => void;
}

interface Row {
  label: string;
  render: (etf: Etf, profile: ReturnType<typeof deriveProfile>) => React.ReactNode;
}

const rows: Row[] = [
  { label: "Ticker", render: (e) => <span className="font-bold text-emerald-700">{e.ticker}</span> },
  { label: "Name", render: (e) => e.name },
  { label: "Category", render: (e) => e.category },
  {
    label: "Risk level",
    render: (e) => (
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${riskBadge[e.riskLevel]}`}>
        {e.riskLevel}
      </span>
    ),
  },
  { label: "Best for", render: (e) => e.bestFor },
  {
    label: "Fit for you",
    render: (e, profile) => {
      const fit = getFit(e.ticker, profile);
      return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${fit.style}`}>
          {fit.label}
        </span>
      );
    },
  },
  { label: "Why it might fit", render: (e) => e.whyFit },
  { label: "Watch out for", render: (e) => e.watchOut },
  { label: "Beginner note", render: (e) => e.beginnerNote },
];

export default function CompareETFs({ answers, watchedTickers, onBack }: Props) {
  const [tickerA, setTickerA] = useState("");
  const [tickerB, setTickerB] = useState("");
  const [showCoach, setShowCoach] = useState(false);

  const profile = deriveProfile(answers);
  const etfA = ETFs.find((e) => e.ticker === tickerA) ?? null;
  const etfB = ETFs.find((e) => e.ticker === tickerB) ?? null;
  const bothSelected = !!etfA && !!etfB;
  const sameSelected = bothSelected && tickerA === tickerB;
  const canCompare = bothSelected && !sameSelected;

  function getCoachContent() {
    const key = [tickerA, tickerB].sort().join("-");
    return comparisonExplanations[key] ?? genericCoachContent;
  }

  function optionLabel(etf: Etf) {
    return watchedTickers.has(etf.ticker) ? `${etf.ticker} — ${etf.name} ★ Saved` : `${etf.ticker} — ${etf.name}`;
  }

  return (
    <main className="min-h-screen px-6 py-14 max-w-5xl mx-auto">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer mb-8 inline-block"
      >
        ← Back to ETFs
      </button>

      {/* Header */}
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Compare ETFs</h1>
        <p className="text-slate-500 text-sm leading-relaxed max-w-xl">
          Select two ETFs to see them side by side. This is educational only and not financial advice.
        </p>
      </div>

      {/* Watchlist hint */}
      {watchedTickers.size >= 2 && (
        <div className="mb-6 inline-flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-lg">
          <span>★</span>
          <span>You can compare ETFs from your saved watchlist — look for the ★ Saved label in the dropdowns.</span>
        </div>
      )}

      {/* Dropdowns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {/* ETF A */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">ETF A</label>
          <select
            value={tickerA}
            onChange={(e) => { setTickerA(e.target.value); setShowCoach(false); }}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Select an ETF…</option>
            {ETFs.map((etf) => (
              <option key={etf.ticker} value={etf.ticker}>
                {optionLabel(etf)}
              </option>
            ))}
          </select>
        </div>

        {/* ETF B */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-widest">ETF B</label>
          <select
            value={tickerB}
            onChange={(e) => { setTickerB(e.target.value); setShowCoach(false); }}
            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option value="">Select an ETF…</option>
            {ETFs.map((etf) => (
              <option key={etf.ticker} value={etf.ticker}>
                {optionLabel(etf)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Same ETF warning */}
      {sameSelected && (
        <div className="mb-6 text-sm text-amber-700 bg-amber-50 border border-amber-200 px-4 py-3 rounded-xl">
          Choose two different ETFs to compare.
        </div>
      )}

      {/* Empty state */}
      {!bothSelected && (
        <div className="mt-12 flex flex-col items-center text-center gap-3 text-slate-400">
          <span className="text-3xl">⇄</span>
          <p className="text-sm">Select two ETFs above to see a side-by-side comparison.</p>
        </div>
      )}

      {/* Comparison table */}
      {canCompare && etfA && etfB && (
        <div className="space-y-8">
          <div className="overflow-x-auto rounded-2xl border border-slate-100 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-400 uppercase tracking-widest w-32">
                    Field
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-emerald-700 uppercase tracking-widest">
                    {etfA.ticker}
                  </th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-blue-700 uppercase tracking-widest">
                    {etfB.ticker}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.label}
                    className={`border-b border-slate-50 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
                  >
                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-400 align-top whitespace-nowrap">
                      {row.label}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 align-top leading-relaxed">
                      {row.render(etfA, profile)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 align-top leading-relaxed">
                      {row.render(etfB, profile)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Comparison summary */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-2">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
              Plain-English Summary
            </h2>
            <p className="text-slate-700 text-sm leading-relaxed">
              {getSummary(tickerA, tickerB)}
            </p>
          </div>

          {/* Coach explanation */}
          {!showCoach ? (
            <button
              onClick={() => setShowCoach(true)}
              className="w-full py-2.5 rounded-xl text-sm font-medium border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              ✦ Explain this comparison
            </button>
          ) : (
            <CoachExplanation content={getCoachContent()} onClose={() => setShowCoach(false)} />
          )}

          {/* Profile guidance */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-2">
            <h2 className="text-xs font-semibold text-emerald-600 uppercase tracking-widest">
              {profile ? `For ${profile}s` : "A starting point"}
            </h2>
            <p className="text-emerald-800 text-sm leading-relaxed">
              {profile
                ? profileGuidance[profile]
                : "Start by thinking about your timeline, risk tolerance, and whether you are investing for short-term stability or long-term growth."}
            </p>
          </div>

          {/* Disclaimer */}
          <div className="rounded-xl bg-slate-100 border border-slate-200 px-5 py-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              <span className="font-semibold text-slate-600">Educational only. </span>
              Not financial advice. Always consult a licensed financial advisor before making investment decisions.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
