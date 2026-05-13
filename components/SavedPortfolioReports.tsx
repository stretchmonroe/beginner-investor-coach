"use client";

import { useState, useEffect } from "react";
import {
  getPortfolioReports,
  deletePortfolioReport,
  rowToReportData,
} from "@/lib/portfolioReports";
import type { PortfolioReportRow, PortfolioReportData } from "@/lib/portfolioReports";
import type { Holding, PortfolioContext } from "@/types/portfolio";
import { formatDate } from "@/lib/formatters";
import Card from "@/components/ui/Card";
import Disclaimer from "@/components/ui/Disclaimer";
import EmptyState from "@/components/ui/EmptyState";
import SectionHeader from "@/components/ui/SectionHeader";
import { trackEvent } from "@/lib/analytics";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  return "$" + v.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct(v: number): string { return v.toFixed(1) + "%"; }

function largestHolding(
  holdings: Holding[],
  totalValue: number
): { label: string; weight: number } | null {
  if (!holdings.length || totalValue <= 0) return null;
  const sorted = [...holdings].sort((a, b) => b.marketValue - a.marketValue);
  const h = sorted[0];
  return { label: h.ticker || h.name, weight: (h.marketValue / totalValue) * 100 };
}

function top3Weight(holdings: Holding[], totalValue: number): number | null {
  if (holdings.length < 3 || totalValue <= 0) return null;
  const sorted = [...holdings].sort((a, b) => b.marketValue - a.marketValue);
  return (sorted.slice(0, 3).reduce((s, h) => s + h.marketValue, 0) / totalValue) * 100;
}

// ─── Proportion bar ───────────────────────────────────────────────────────────

function ProportionBar({ weight }: { weight: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-400"
          style={{ width: `${Math.min(weight, 100)}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-600 w-10 text-right shrink-0">
        {pct(weight)}
      </span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  sessionId: string;
  userId?: string;
  onCountChange?: (count: number) => void;
  onRestoreReport?: (holdings: Holding[]) => void;
  onViewReport?: (data: PortfolioReportData) => void;
  onAskCoach?: (question: string, context: PortfolioContext) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SavedPortfolioReports({
  sessionId,
  userId,
  onCountChange,
  onRestoreReport,
  onViewReport,
  onAskCoach,
}: Props) {
  const [reports, setReports] = useState<PortfolioReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    getPortfolioReports(sessionId, userId)
      .then((rows) => {
        setReports(rows);
        onCountChange?.(rows.length);
      })
      .catch(() => {
        setReports([]);
        onCountChange?.(0);
      })
      .finally(() => setLoading(false));
  }, [sessionId, userId, onCountChange]);

  async function handleDelete(id: string) {
    const prev = [...reports];
    const next = reports.filter((r) => r.id !== id);
    setReports(next);
    onCountChange?.(next.length);
    setConfirmDeleteId(null);
    setDeleteErrorId(null);
    if (expandedId === id) setExpandedId(null);
    try {
      await deletePortfolioReport(id);
      trackEvent("report_deleted");
    } catch {
      setReports(prev);
      onCountChange?.(prev.length);
      setDeleteErrorId(id);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400 py-4">Loading saved snapshots…</p>;
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        title="No saved snapshots"
        description="Saved portfolio snapshots will appear here after you enter holdings in Portfolio X-Ray and click Save snapshot."
      />
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => {
        const holdings = report.holdings_json ?? [];
        const totalValue = report.total_value ?? 0;
        const isExpanded = expandedId === report.id;
        const largest = largestHolding(holdings, totalValue);
        const top3 = top3Weight(holdings, totalValue);
        const concentration = report.concentration_json;
        const exposure = report.exposure_json;
        const overlap = report.overlap_insights_json;
        const notes = concentration?.notes;
        const unknownCount = concentration?.unknownHoldingCount;
        const mappedCount = concentration?.mappedHoldingCount;
        const hasMixedCurrencies = concentration?.hasMixedCurrencies;

        return (
          <Card key={report.id} padding="sm">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="min-w-0">
                <p className="text-xs text-slate-400">{formatDate(report.created_at)} · snapshot</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                  {report.report_name ?? "Portfolio X-Ray"}
                </p>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <button
                  onClick={() => {
                    if (onViewReport) {
                      trackEvent("report_viewed", { source: "list" });
                      onViewReport(rowToReportData(report));
                    } else {
                      setExpandedId(isExpanded ? null : report.id);
                    }
                  }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                >
                  {onViewReport ? "View" : isExpanded ? "Close" : "View"}
                </button>
                {confirmDeleteId === report.id ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleDelete(report.id)}
                      className="text-xs font-medium text-red-600 hover:text-red-800 transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(report.id)}
                    className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>

            {/* Notes */}
            {notes && (
              <p className="text-xs text-slate-500 italic mb-2 leading-relaxed">{notes}</p>
            )}

            {/* Summary metrics */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs mb-2">
              <div>
                <p className="text-slate-400">Total value</p>
                <p className="font-semibold text-slate-700">
                  {totalValue > 0 ? fmt(totalValue) : "—"}
                </p>
              </div>
              <div>
                <p className="text-slate-400">Holdings</p>
                <p className="font-semibold text-slate-700">{holdings.length}</p>
              </div>
              {largest && (
                <div className="col-span-2">
                  <p className="text-slate-400">Largest holding</p>
                  <p className="font-semibold text-slate-700">
                    {largest.label} — {pct(largest.weight)}
                  </p>
                </div>
              )}
              {top3 !== null && (
                <div>
                  <p className="text-slate-400">Top 3 combined</p>
                  <p className="font-semibold text-slate-700">{pct(top3)}</p>
                </div>
              )}
              {exposure?.sectorExposure?.[0] && (
                <div>
                  <p className="text-slate-400">Top sector</p>
                  <p className="font-semibold text-slate-700">
                    {exposure.sectorExposure[0].label} — {pct(exposure.sectorExposure[0].weight)}
                  </p>
                </div>
              )}
            </div>

            {/* Snapshot metadata badges */}
            {(hasMixedCurrencies || (unknownCount != null && unknownCount > 0) || mappedCount != null) && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {hasMixedCurrencies && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    Mixed currencies
                  </span>
                )}
                {unknownCount != null && unknownCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                    {unknownCount} unmapped
                  </span>
                )}
                {mappedCount != null && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                    {mappedCount} mapped
                  </span>
                )}
              </div>
            )}

            {/* Expanded detail view */}
            {isExpanded && (
              <div className="border-t border-slate-100 pt-4 space-y-5 mt-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Snapshot — read only · analysis from {formatDate(report.created_at)}
                </p>

                {/* Holdings */}
                {holdings.length > 0 && (
                  <div>
                    <SectionHeader title="Holdings" className="!mb-2" />
                    <div className="space-y-2">
                      {[...holdings]
                        .sort((a, b) => b.marketValue - a.marketValue)
                        .map((h) => {
                          const weight = totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0;
                          return (
                            <div
                              key={h.id}
                              className="flex items-center justify-between text-xs gap-2"
                            >
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-800">
                                  {h.ticker || h.name}
                                </span>
                                {h.ticker && h.name && (
                                  <span className="text-slate-400 ml-1.5 truncate">
                                    {h.name}
                                  </span>
                                )}
                                {h.currency && (
                                  <span className="text-slate-400 ml-1">· {h.currency}</span>
                                )}
                              </div>
                              <div className="text-right shrink-0">
                                <p className="font-semibold text-slate-700">{fmt(h.marketValue)}</p>
                                <p className="text-slate-400">{pct(weight)}</p>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Asset mix */}
                {concentration?.assetMix && concentration.assetMix.length > 0 && (
                  <div>
                    <SectionHeader title="Asset Type Mix" className="!mb-2" />
                    <div className="space-y-2">
                      {concentration.assetMix.map((m) => (
                        <div key={m.assetType} className="flex items-center gap-3">
                          <span className="text-xs text-slate-600 w-24 shrink-0">
                            {m.assetType}
                          </span>
                          <ProportionBar weight={m.weight} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Concentration insights */}
                {concentration?.concentrationInsights &&
                  concentration.concentrationInsights.length > 0 && (
                    <div>
                      <SectionHeader title="Concentration" className="!mb-2" />
                      <div className="space-y-2">
                        {concentration.concentrationInsights.map((ins) => (
                          <div
                            key={ins.id}
                            className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5"
                          >
                            <p className="text-xs font-semibold text-slate-700 mb-0.5">
                              {ins.title}
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {ins.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Sector exposure */}
                {exposure?.sectorExposure && exposure.sectorExposure.length > 0 && (
                  <div>
                    <SectionHeader title="Sector Exposure" className="!mb-2" />
                    <div className="space-y-2">
                      {exposure.sectorExposure.map((s) => (
                        <div key={s.label} className="flex items-center gap-3">
                          <span className="text-xs text-slate-600 w-28 shrink-0">{s.label}</span>
                          <ProportionBar weight={s.weight} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Geography exposure */}
                {exposure?.geographyExposure && exposure.geographyExposure.length > 0 && (
                  <div>
                    <SectionHeader title="Geography Exposure" className="!mb-2" />
                    <div className="space-y-2">
                      {exposure.geographyExposure.map((g) => (
                        <div key={g.label} className="flex items-center gap-3">
                          <span className="text-xs text-slate-600 w-28 shrink-0">{g.label}</span>
                          <ProportionBar weight={g.weight} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Currency exposure */}
                {exposure?.currencyExposure && exposure.currencyExposure.length > 0 && (
                  <div>
                    <SectionHeader title="Currency Exposure" className="!mb-2" />
                    <div className="space-y-2">
                      {exposure.currencyExposure.map((c) => (
                        <div key={c.label} className="flex items-center gap-3">
                          <span className="text-xs text-slate-600 w-28 shrink-0">{c.label}</span>
                          <ProportionBar weight={c.weight} />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                      Currency exposure is simplified. A Canadian-listed ETF may still hold
                      foreign assets.
                    </p>
                  </div>
                )}

                {/* Overlap + theme insights */}
                {overlap &&
                  [...(overlap.overlapInsights ?? []), ...(overlap.themeInsights ?? [])].length >
                    0 && (
                    <div>
                      <SectionHeader title="Overlap & Theme Insights" className="!mb-2" />
                      <div className="space-y-2">
                        {[...overlap.overlapInsights, ...overlap.themeInsights].map((ins) => (
                          <div
                            key={ins.id}
                            className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5"
                          >
                            <p className="text-xs font-semibold text-slate-700 mb-0.5">
                              {ins.title}
                            </p>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {ins.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Snapshot metadata note */}
                <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
                  <p className="text-xs font-semibold text-slate-500 mb-1">About this snapshot</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Analysis from {formatDate(report.created_at)} using simplified exposure mappings.
                    {unknownCount != null && unknownCount > 0
                      ? ` ${unknownCount} holding${unknownCount === 1 ? "" : "s"} could not be mapped — exposure estimates for those may be incomplete.`
                      : ""}
                    {" "}Educational only. Not financial advice.
                  </p>
                </div>

                {onAskCoach && holdings.length > 0 && (
                  <button
                    onClick={() => {
                      const totalVal = report.total_value ?? 0;
                      const ctx: PortfolioContext = {
                        reportName: report.report_name ?? undefined,
                        savedAt: report.created_at,
                        totalValue: totalVal,
                        currency: report.currency ?? "CAD",
                        holdings: [...holdings]
                          .sort((a, b) => b.marketValue - a.marketValue)
                          .map((h) => ({
                            ticker: h.ticker,
                            name: h.name,
                            assetType: h.assetType,
                            marketValue: h.marketValue,
                            weight: totalVal > 0 ? (h.marketValue / totalVal) * 100 : 0,
                          })),
                        largestHolding: (() => {
                          const sorted = [...holdings].sort((a, b) => b.marketValue - a.marketValue);
                          return sorted.length > 0 && totalVal > 0
                            ? { label: sorted[0].ticker || sorted[0].name, weight: (sorted[0].marketValue / totalVal) * 100 }
                            : undefined;
                        })(),
                        assetMix: concentration?.assetMix?.map((m) => ({ assetType: m.assetType, weight: m.weight })),
                        sectorExposure: exposure?.sectorExposure,
                        geographyExposure: exposure?.geographyExposure,
                        currencyExposure: exposure?.currencyExposure,
                        concentrationInsights: concentration?.concentrationInsights?.map((i) => ({ title: i.title, description: i.description })),
                        overlapInsights: overlap?.overlapInsights?.map((i) => ({ title: i.title, description: i.description })),
                        themeInsights: overlap?.themeInsights?.map((i) => ({ title: i.title, description: i.description })),
                        unknownHoldingCount: unknownCount,
                        hasMixedCurrencies: hasMixedCurrencies ?? false,
                      };
                      onAskCoach("Explain this saved Portfolio snapshot in plain English. Summarize the holdings, concentration, exposure, overlap, and what may be worth understanding. Keep it educational only.", ctx);
                    }}
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🪔</span> Ask Lantern about this snapshot →
                  </button>
                )}

                {onRestoreReport && holdings.length > 0 && (
                  <button
                    onClick={() => {
                      onRestoreReport(holdings);
                      setExpandedId(null);
                    }}
                    className="text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Re-open in Portfolio X-Ray →
                  </button>
                )}
              </div>
            )}

            {deleteErrorId === report.id && (
              <p className="text-xs text-red-600 mt-2">Could not delete. Please try again.</p>
            )}
          </Card>
        );
      })}

      <Disclaimer extended="Educational only. Not financial advice. Saved snapshots are based on manually entered holdings and simplified exposure mappings at the time of saving." />
    </div>
  );
}
