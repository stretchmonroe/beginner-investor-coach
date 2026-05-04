"use client";

import { useState, useEffect } from "react";
import { getLearningPlans, deleteLearningPlan } from "@/lib/learningPlans";
import type { LearningPlan } from "@/lib/learningPlans";

function fmt(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function allocationSummary(allocation: LearningPlan["allocation_json"]): string {
  return allocation.map((a) => `${a.ticker} ${a.allocation_percent}%`).join(", ");
}

interface Props {
  sessionId: string;
  refreshTrigger: number;
  onView: (plan: LearningPlan) => void;
}

export default function SavedLearningPlans({ sessionId, refreshTrigger, onView }: Props) {
  const [plans, setPlans] = useState<LearningPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    getLearningPlans(sessionId)
      .then(setPlans)
      .catch(() => setPlans([]))
      .finally(() => setLoading(false));
  }, [sessionId, refreshTrigger]);

  async function handleDelete(id: string) {
    const prev = [...plans];
    setPlans((p) => p.filter((pl) => pl.id !== id));
    setDeleteErrorId(null);
    try {
      await deleteLearningPlan(id);
    } catch {
      setPlans(prev);
      setDeleteErrorId(id);
    }
  }

  return (
    <div className="border-t border-slate-200 pt-8 mt-8">
      <div className="mb-5 space-y-1">
        <h2 className="text-xl font-bold text-slate-900">Saved Learning Plans</h2>
        <p className="text-sm text-slate-500">Your saved educational plans for this session.</p>
      </div>

      {loading && (
        <p className="text-sm text-slate-400">Loading…</p>
      )}

      {!loading && plans.length === 0 && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 px-5 py-6 text-center">
          <p className="text-sm text-slate-500">Saved learning plans will appear here.</p>
        </div>
      )}

      {!loading && plans.length > 0 && (
        <div className="space-y-4">
          {plans.map((plan) => {
            const pi = plan.portfolio_inputs_json;
            const pa = plan.projection_assumptions_json;
            const pr = plan.projection_results_json;
            return (
              <div
                key={plan.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-slate-400">{formatDate(plan.created_at)}</p>
                    <p className="font-semibold text-slate-800 text-sm mt-0.5">
                      {plan.investor_profile ?? "Balanced Beginner"}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => onView(plan)}
                      className="text-xs font-medium text-emerald-700 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(plan.id)}
                      className="text-xs font-medium text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-xs">
                  <div>
                    <p className="text-slate-400">Monthly contribution</p>
                    <p className="font-semibold text-slate-700">{fmt(pi.monthly_contribution)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Timeline</p>
                    <p className="font-semibold text-slate-700">{pi.timeline}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Return assumption</p>
                    <p className="font-semibold text-slate-700">{pa.annual_return_assumption}%</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Est. future value</p>
                    <p className="font-semibold text-emerald-700">{fmt(pr.estimated_future_value)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Est. monthly income</p>
                    <p className="font-semibold text-slate-700">{fmt(pr.estimated_monthly_income)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Allocation</p>
                    <p className="font-semibold text-slate-700 truncate">{allocationSummary(plan.allocation_json)}</p>
                  </div>
                </div>

                {deleteErrorId === plan.id && (
                  <p className="text-xs text-red-600">Could not delete. Please try again.</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 rounded-xl bg-slate-100 border border-slate-200 px-5 py-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-600">Educational only. Not financial advice. </span>
          Saved plans are learning examples based on your inputs, not recommendations to buy.
        </p>
      </div>
    </div>
  );
}
