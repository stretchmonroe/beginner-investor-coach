"use client";

import { useState, useEffect } from "react";
import {
  getPortfolioReports,
  deletePortfolioReport,
} from "@/lib/portfolioReports";
import type { PortfolioReportRow } from "@/lib/portfolioReports";
import type { Holding, PortfolioContext } from "@/types/portfolio";
import { formatDate } from "@/lib/formatters";
import Card from "@/components/ui/Card";
import Disclaimer from "@/components/ui/Disclaimer";
import EmptyState from "@/components/ui/EmptyState";
import SectionHeader from "@/components/ui/SectionHeader";

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
  onCountChange?: (count: number) => void;
  onRestoreReport?: (holdings: Holding[]) => void;
  onAskCoach?: (question: string, context: PortfolioContext) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SavedPortfolioReports({
  sessionId,
  onCountChange,
  onRestoreReport,
  onAskCoach,
}: Props) {
  const [reports, setReports] = useState<PortfolioReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    getPortfolioReports(sessionId)
      .then((rows) => {
        setReports(rows);
        onCountChange?.(rows.length);
      })
      .catch(() => {
        setReports([]);
        onCountChange?.(0);
      })
      .finally(() => setLoading(false));
  }, [sessionId, onCountChange]);

  async function handleDelete(id: string) {
    const prev = [...reports];
    const next = reports.filter((r) => r.id !== id);
    setReports(next);
    onCountChange?.(next.length);
    setDeleteErrorId(null);
    if (expandedId === id) setExpandedId(null);
    try {
      await deletePortfolioReport(id);
    } catch {
      setReports(prev);
      onCountChange?.(prev.length);
      setDeleteErrorId(id);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400 py-4">Loading saved portfolio reports…</p>;
  }

  if (reports.length === 0) {
    return (
      <EmptyState
        title="No saved portfolio reports"
        description="Saved portfolio reports will appear here after you enter holdings in Portfolio X-Ray and click Save."
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

        return (
          <Card key={report.id} padding="sm">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <p className="text-xs text-slate-400">{formatDate(report.created_at)}</p>
                <p className="text-sm font-semibold text-slate-800 mt-0.5 truncate">
                  {report.report_name ?? "Portfolio X-Ray"}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setExpandedId(isExpanded ? null : report.id)}
                  className="text-xs font-medium text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  {isExpanded ? "Close" : "View"}
                </button>
                <button
                  onClick={() => handleDelete(report.id)}
                  className="text-xs font-medium text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>

            {/* Summary metrics */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-2">
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
                <div>
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
                <div className="col-span-2">
                  <p className="text-slate-400">Largest sector</p>
                  <p className="font-semibold text-slate-700">
                    {exposure.sectorExposure[0].label} — {pct(exposure.sectorExposure[0].weight)}
                  </p>
                </div>
              )}
            </div>

            {/* Expanded detail view */}
            {isExpanded && (
              <div className="border-t border-slate-100 pt-4 space-y-5 mt-2">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                  Report details — read only
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
                      <SectionHeader title="Insights" className="!mb-2" />
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

                <p className="text-xs text-slate-400 leading-relaxed pt-1">
                  Educational only. Not financial advice. This report is based on the holdings
                  entered and simplified exposure mappings. It may not reflect current fund
                  holdings, fees, or your full financial situation.
                </p>

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
                      };
                      onAskCoach("Explain this saved Portfolio Report in plain English. Summarize the holdings, concentration, exposure, overlap, and what may be worth understanding. Keep it educational only.", ctx);
                    }}
                    className="w-full text-sm font-medium text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
                  >
                    ✦ Explain this saved report
                  </button>
                )}

                {onRestoreReport && holdings.length > 0 && (
                  <button
                    onClick={() => {
                      onRestoreReport(holdings);
                      setExpandedId(null);
                    }}
                    className="w-full text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 px-4 py-2.5 rounded-xl cursor-pointer transition-colors"
                  >
                    Use this report in Portfolio X-Ray →
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

      <Disclaimer extended="Educational only. Not financial advice. Saved portfolio reports are snapshots based on manually entered holdings and simplified exposure mappings." />
    </div>
  );
}
