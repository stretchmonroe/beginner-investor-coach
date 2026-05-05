"use client";

import { useState, useEffect } from "react";
import { getReadinessPlans, deleteReadinessPlan } from "@/lib/readinessPlans";
import type { ReadinessPlanRow } from "@/lib/readinessPlans";
import { formatCurrency, formatDate } from "@/lib/formatters";
import Card from "@/components/ui/Card";
import Disclaimer from "@/components/ui/Disclaimer";
import EmptyState from "@/components/ui/EmptyState";
import SectionHeader from "@/components/ui/SectionHeader";

const feasibilityColors: Record<string, string> = {
  covered: "text-blue-700",
  "on-track": "text-teal-700",
  close: "text-amber-700",
  difficult: "text-rose-700",
};

const feasibilityLabels: Record<string, string> = {
  covered: "Already covered",
  "on-track": "On track",
  close: "Close",
  difficult: "Difficult",
};

function allocationSummary(items: ReadinessPlanRow["sample_allocation_json"]): string {
  if (!items || items.length === 0) return "—";
  return items.map((i) => `${i.selectedTicker} ${i.allocationPercent}%`).join(", ");
}

interface Props {
  sessionId: string;
  onCountChange?: (count: number) => void;
}

export default function SavedReadinessPlans({ sessionId, onCountChange }: Props) {
  const [plans, setPlans] = useState<ReadinessPlanRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    getReadinessPlans(sessionId)
      .then((rows) => {
        setPlans(rows);
        onCountChange?.(rows.length);
      })
      .catch(() => {
        setPlans([]);
        onCountChange?.(0);
      })
      .finally(() => setLoading(false));
  }, [sessionId, onCountChange]);

  async function handleDelete(id: string) {
    const prev = [...plans];
    const next = plans.filter((p) => p.id !== id);
    setPlans(next);
    onCountChange?.(next.length);
    setDeleteErrorId(null);
    if (expandedId === id) setExpandedId(null);
    try {
      await deleteReadinessPlan(id);
    } catch {
      setPlans(prev);
      onCountChange?.(prev.length);
      setDeleteErrorId(id);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400 py-4">Loading saved plans…</p>;
  }

  if (plans.length === 0) {
    return (
      <EmptyState
        title="No saved readiness plans"
        description="Saved readiness plans will appear here after you complete the Sample Learning Allocation and click Save."
      />
    );
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => {
        const cg = plan.contribution_guidance_json;
        const gp = plan.goal_plan_json;
        const pa = plan.projection_assumptions_json;
        const pr = plan.projection_result_json;
        const isExpanded = expandedId === plan.id;

        const feasColor = gp?.feasibilityStatus
          ? (feasibilityColors[gp.feasibilityStatus] ?? "text-slate-600")
          : "text-slate-400";
        const feasLabel = gp?.feasibilityStatus
          ? (feasibilityLabels[gp.feasibilityStatus] ?? gp.feasibilityStatus)
          : "—";

        return (
          <Card key={plan.id} padding="sm">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-400">{formatDate(plan.created_at)}</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5">
                  {plan.investor_profile ?? "Balanced Beginner"}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : plan.id)}
                  className="text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  {isExpanded ? "Close" : "View details"}
                </button>
                <button
                  onClick={() => handleDelete(plan.id)}
                  className="text-xs font-medium text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Summary metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2.5 text-xs mb-3">
              <div>
                <p className="text-slate-400">Contribution range</p>
                <p className="font-semibold text-slate-700">
                  {cg
                    ? `${formatCurrency(cg.estimatedContributionMin)} – ${formatCurrency(cg.estimatedContributionMax)}/mo`
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Target amount</p>
                <p className="font-semibold text-slate-700">
                  {gp ? formatCurrency(gp.targetAmount) : "—"}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Timeline</p>
                <p className="font-semibold text-slate-700">
                  {gp
                    ? `${gp.timelineYears} years`
                    : pa?.timeline ?? "—"}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Feasibility</p>
                <p className={`font-semibold ${feasColor}`}>{feasLabel}</p>
              </div>
              <div>
                <p className="text-slate-400">Est. future value</p>
                <p className="font-semibold text-slate-700">
                  {pr ? formatCurrency(pr.estimatedFutureValue) : "—"}
                </p>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <p className="text-slate-400">Allocation</p>
                <p className="font-semibold text-slate-700 truncate">
                  {allocationSummary(plan.sample_allocation_json)}
                </p>
              </div>
            </div>

            {/* Expanded detail view */}
            {isExpanded && (
              <div className="border-t border-slate-100 pt-4 space-y-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Plan details — read only
                </p>

                {/* Money Snapshot */}
                {plan.money_snapshot_json && (
                  <div>
                    <SectionHeader title="Money Snapshot" className="!mb-2" />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <p className="text-slate-400">Monthly take-home</p>
                        <p className="font-semibold text-slate-700">{formatCurrency(plan.money_snapshot_json.monthlyTakeHomePay)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Monthly surplus</p>
                        <p className="font-semibold text-slate-700">{cg ? formatCurrency(cg.monthlySurplus) : "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Bills % of income</p>
                        <p className="font-semibold text-slate-700">{cg ? `${cg.billsPercentage.toFixed(0)}%` : "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Debt % of income</p>
                        <p className="font-semibold text-slate-700">{cg ? `${cg.debtPercentage.toFixed(0)}%` : "—"}</p>
                      </div>
                    </div>
                    {cg && cg.cautionNotes.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {cg.cautionNotes.map((note, i) => (
                          <div key={i} className="flex gap-2 items-start text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                            <span className="shrink-0">⚠</span>
                            <span>{note}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Contribution guidance */}
                {cg && (
                  <div>
                    <SectionHeader title="Investing Capacity Estimate" className="!mb-2" />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <p className="text-slate-400">Range</p>
                        <p className="font-semibold text-slate-700">
                          {formatCurrency(cg.estimatedContributionMin)} – {formatCurrency(cg.estimatedContributionMax)}/mo
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Midpoint</p>
                        <p className="font-semibold text-slate-700">{formatCurrency(cg.estimatedContributionMidpoint)}/mo</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Goal plan */}
                {gp && (
                  <div>
                    <SectionHeader title="Goal Feasibility" className="!mb-2" />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <p className="text-slate-400">Target amount</p>
                        <p className="font-semibold text-slate-700">{formatCurrency(gp.targetAmount)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Timeline</p>
                        <p className="font-semibold text-slate-700">{gp.timelineYears} years</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Required monthly</p>
                        <p className="font-semibold text-slate-700">{formatCurrency(gp.requiredMonthlyContribution)}/mo</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Affordable monthly</p>
                        <p className="font-semibold text-slate-700">{formatCurrency(gp.affordableMonthlyContribution)}/mo</p>
                      </div>
                      <div>
                        <p className="text-slate-400">{gp.monthlyGap <= 0 ? "Monthly surplus" : "Monthly gap"}</p>
                        <p className={`font-semibold ${gp.monthlyGap <= 0 ? "text-teal-700" : "text-rose-600"}`}>
                          {gp.monthlyGap <= 0
                            ? `+${formatCurrency(Math.abs(gp.monthlyGap))}`
                            : formatCurrency(gp.monthlyGap)}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400">Feasibility</p>
                        <p className={`font-semibold ${feasColor}`}>{feasLabel}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Projection */}
                {pa && pr && (
                  <div>
                    <SectionHeader title="What-if Projection" className="!mb-2" />
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div>
                        <p className="text-slate-400">Starting amount</p>
                        <p className="font-semibold text-slate-700">{formatCurrency(pa.startingAmount)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Monthly contribution</p>
                        <p className="font-semibold text-slate-700">{formatCurrency(pa.monthlyContribution)}/mo</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Projection years</p>
                        <p className="font-semibold text-slate-700">{pa.projectionYears} years</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Return assumption</p>
                        <p className="font-semibold text-slate-700">{pa.annualReturnAssumption}%</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Total contributed</p>
                        <p className="font-semibold text-slate-700">{formatCurrency(pr.totalContributed)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Est. future value</p>
                        <p className="font-semibold text-blue-700">{formatCurrency(pr.estimatedFutureValue)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Est. annual income</p>
                        <p className="font-semibold text-slate-700">{formatCurrency(pr.estimatedAnnualIncome)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Withdrawal rate</p>
                        <p className="font-semibold text-slate-700">{pa.withdrawalRate}%</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sample allocation detail */}
                {plan.sample_allocation_json && plan.sample_allocation_json.length > 0 && (
                  <div>
                    <SectionHeader title="Sample Allocation" className="!mb-2" />
                    <div className="space-y-2">
                      {plan.sample_allocation_json.map((item) => (
                        <div key={item.roleId} className="flex items-center justify-between text-xs">
                          <div>
                            <span className="font-semibold text-slate-800">{item.selectedTicker}</span>
                            <span className="text-slate-400 ml-2">{item.roleLabel}</span>
                          </div>
                          <span className="font-semibold text-slate-700">{item.allocationPercent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-400 leading-relaxed pt-2">
                  These are educational estimates based on the numbers entered at the time of saving. They do not reflect current market conditions or guarantee any future outcome.
                </p>
              </div>
            )}

            {deleteErrorId === plan.id && (
              <p className="text-xs text-red-600 mt-2">Could not delete. Please try again.</p>
            )}
          </Card>
        );
      })}

      <Disclaimer extended="Educational only. Not financial advice. Saved readiness plans are learning examples based on your inputs, not recommendations to buy or hold any investment." />
    </div>
  );
}
