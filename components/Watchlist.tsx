import { ETFs, getFit, riskBadge, deriveProfile } from "@/lib/etfs";
import type { QuizAnswers } from "./OnboardingQuiz";

interface Props {
  watchedTickers: Set<string>;
  answers: QuizAnswers | null;
  onRemove: (ticker: string) => void;
  onCompare: () => void;
  onBack: () => void;
}

export default function Watchlist({ watchedTickers, answers, onRemove, onCompare, onBack }: Props) {
  const profile = deriveProfile(answers);
  const saved = ETFs.filter((e) => watchedTickers.has(e.ticker));

  return (
    <main className="min-h-screen px-6 py-14 max-w-5xl mx-auto">
      {/* Top nav */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={onBack}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          ← Back to ETFs
        </button>
        <button
          onClick={onCompare}
          className="text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
        >
          ⇄ Compare ETFs
        </button>
      </div>

      {/* Header */}
      <div className="mb-6 space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">My Watchlist</h1>
        <p className="text-slate-500 text-sm leading-relaxed max-w-xl">
          Your watchlist is a learning list, not a recommendation to buy.
          Use it to keep track of ETFs you want to learn more about.
        </p>
      </div>

      {/* Empty state */}
      {saved.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 text-xl">
            ☆
          </div>
          <p className="text-slate-600 font-medium">No ETFs saved yet</p>
          <p className="text-slate-400 text-sm max-w-xs">
            Go back to the ETF explorer and tap Save on any ETF to add it here.
          </p>
          <button
            onClick={onBack}
            className="mt-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium cursor-pointer"
          >
            Explore ETFs →
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {saved.map((etf) => {
            const fit = getFit(etf.ticker, profile);
            return (
              <div
                key={etf.ticker}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col gap-3"
              >
                {/* Ticker + risk */}
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

                {/* Remove */}
                <div className="mt-auto pt-3 border-t border-slate-100">
                  <button
                    onClick={() => onRemove(etf.ticker)}
                    className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors cursor-pointer"
                  >
                    Remove from watchlist
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-12 rounded-xl bg-slate-100 border border-slate-200 px-5 py-4 max-w-xl">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-600">Educational only. </span>
          Not financial advice. Always consult a licensed financial advisor before making investment decisions.
        </p>
      </div>
    </main>
  );
}
