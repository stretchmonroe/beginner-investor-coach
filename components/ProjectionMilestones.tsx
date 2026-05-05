"use client";

import { findMilestoneYear } from "@/lib/readinessCalculations";
import { formatCurrency } from "@/lib/formatters";

const MILESTONES = [50_000, 100_000, 250_000, 500_000, 1_000_000];

interface Props {
  starting: number;
  monthly: number;
  years: number;
  annualReturnPct: number;
}

export default function ProjectionMilestones({ starting, monthly, years, annualReturnPct }: Props) {
  const reached = MILESTONES.map((target) => ({
    target,
    year: findMilestoneYear(starting, monthly, years, annualReturnPct, target),
  })).filter((m) => m.year !== null) as { target: number; year: number }[];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-5">
      <div className="mb-4 space-y-1">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
          Milestone estimates
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Approximate years to reach each portfolio value based on your current assumptions. Not a guarantee.
        </p>
      </div>

      {reached.length === 0 ? (
        <p className="text-sm text-slate-400 py-2">
          No milestones reached within your {years}-year timeline under this return assumption. Try a longer timeline or higher return.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {reached.map(({ target, year }) => (
            <div
              key={target}
              className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 space-y-0.5"
            >
              <p className="text-xs font-semibold text-emerald-700">
                {formatCurrency(target)}
              </p>
              <p className="text-sm font-bold text-slate-800">
                ~Year {year}
              </p>
              <p className="text-xs text-slate-400">
                {year === 0 ? "Already there" : `Around year ${year}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
