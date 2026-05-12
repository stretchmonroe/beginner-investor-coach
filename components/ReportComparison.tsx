"use client";

import { useState, useEffect } from "react";
import {
  getPortfolioReports,
  rowToReportData,
} from "@/lib/portfolioReports";
import type { PortfolioReportRow, PortfolioReportData } from "@/lib/portfolioReports";
import {
  computeReportComparison,
  buildComparisonCoachQuestion,
} from "@/lib/reportComparison";
import type { ExposureDiff, HoldingChange } from "@/lib/reportComparison";
import type { PortfolioContext } from "@/types/portfolio";
import { formatDate } from "@/lib/formatters";
import PageLayout from "@/components/ui/PageLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Disclaimer from "@/components/ui/Disclaimer";
import EmptyState from "@/components/ui/EmptyState";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { canUseReportComparison, UPGRADE_COPY } from "@/lib/subscriptionFeatures";
import { trackEvent } from "@/lib/analytics";

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(v: number): string {
  return "$" + v.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(v: number): string {
  return v.toFixed(1) + "%";
}

function signedPct(v: number): string {
  return `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;
}

function signedVal(v: number): string {
  return `${v > 0 ? "+" : ""}${fmt(Math.abs(v))}`;
}

function deltaClass(v: number): string {
  if (v > 0.5) return "text-teal-600";
  if (v < -0.5) return "text-rose-500";
  return "text-slate-400";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SummaryMetric({
  label,
  earlier,
  later,
  delta,
  deltaLabel,
}: {
  label: string;
  earlier: string;
  later: string;
  delta?: string;
  deltaLabel?: "positive" | "negative" | "neutral";
}) {
  const dlClass =
    deltaLabel === "positive"
      ? "text-teal-600"
      : deltaLabel === "negative"
      ? "text-rose-500"
      : "text-slate-500";

  return (
    <Card variant="muted" padding="sm">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-xs text-slate-500 mb-0.5">
        Earlier: <span className="font-semibold text-slate-700">{earlier}</span>
      </p>
      <p className="text-xs text-slate-500 mb-0.5">
        Later: <span className="font-semibold text-slate-700">{later}</span>
      </p>
      {delta && (
        <p className={`text-xs font-semibold mt-1 ${dlClass}`}>{delta}</p>
      )}
    </Card>
  );
}

function ExposureDiffRow({ diff }: { diff: ExposureDiff }) {
  const ppSign = diff.delta > 0 ? "+" : "";
  const hasDiff = Math.abs(diff.delta) >= 0.1;
  return (
    <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0 gap-2">
      <span className="text-slate-700 shrink-0 w-28 truncate">{diff.label}</span>
      <span className="text-slate-500 shrink-0">{pct(diff.earlier)}</span>
      <span className="text-slate-300 shrink-0">→</span>
      <span className="text-slate-700 font-semibold shrink-0">{pct(diff.later)}</span>
      {hasDiff ? (
        <span className={`font-semibold shrink-0 ${deltaClass(diff.delta)}`}>
          {ppSign}{diff.delta.toFixed(1)} pp
        </span>
      ) : (
        <span className="text-slate-300 shrink-0">—</span>
      )}
    </div>
  );
}

function ExposureSection({ title, diffs }: { title: string; diffs: ExposureDiff[] }) {
  const visible = diffs.filter((d) => d.earlier > 0 || d.later > 0);
  if (!visible.length) return null;
  return (
    <div className="mb-4">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
        {title}
      </p>
      <Card padding="sm">
        <div className="flex items-center justify-between text-xs text-slate-400 pb-1 border-b border-slate-100 mb-1">
          <span className="w-28 shrink-0">Category</span>
          <span className="shrink-0">Earlier</span>
          <span className="text-slate-200 shrink-0">→</span>
          <span className="shrink-0">Later</span>
          <span className="shrink-0 w-14 text-right">Change</span>
        </div>
        {visible.map((d) => (
          <ExposureDiffRow key={d.label} diff={d} />
        ))}
      </Card>
    </div>
  );
}

function HoldingChangeRow({ hc }: { hc: HoldingChange }) {
  const label = hc.ticker || hc.name || "Unknown";
  return (
    <div className="flex items-center justify-between text-xs py-2 border-b border-slate-100 last:border-0 gap-2">
      <span className="font-semibold text-slate-700 shrink-0 max-w-[100px] truncate">{label}</span>
      {hc.ticker && hc.name && (
        <span className="text-slate-400 flex-1 truncate hidden sm:block">{hc.name}</span>
      )}
      <span className="text-slate-500 shrink-0">{fmt(hc.earlierValue)}</span>
      <span className="text-slate-300 shrink-0">→</span>
      <span className="text-slate-700 font-semibold shrink-0">{fmt(hc.laterValue)}</span>
      <span className={`font-semibold shrink-0 ${deltaClass(hc.delta)}`}>
        {hc.delta > 0 ? "+" : ""}{fmt(Math.abs(hc.delta))}
      </span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  sessionId: string;
  onBack: () => void;
  onAskCoach?: (question: string, context?: PortfolioContext) => void;
  onViewPremium?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Phase = "loading" | "empty" | "select" | "compare" | "error";

const selectClass =
  "w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white";

export default function ReportComparison({ sessionId, onBack, onAskCoach, onViewPremium }: Props) {
  const { tier } = useSubscription();
  const [phase, setPhase] = useState<Phase>("loading");
  const [reports, setReports] = useState<PortfolioReportRow[]>([]);
  const [earlierId, setEarlierId] = useState<string>("");
  const [laterId, setLaterId] = useState<string>("");
  const [earlierData, setEarlierData] = useState<PortfolioReportData | null>(null);
  const [laterData, setLaterData] = useState<PortfolioReportData | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    getPortfolioReports(sessionId)
      .then((rows) => {
        if (rows.length < 2) {
          setPhase("empty");
        } else {
          setReports(rows);
          // Default: most recent as later, second-most-recent as earlier
          const sorted = [...rows].sort(
            (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setLaterId(sorted[0].id);
          setEarlierId(sorted[1].id);
          setPhase("select");
        }
      })
      .catch(() => setPhase("error"));
  }, [sessionId]);

  if (!canUseReportComparison(tier)) {
    const copy = UPGRADE_COPY.reportComparison;
    trackEvent("upgrade_prompt_viewed", { feature: "report_comparison" });
    return (
      <PageLayout maxWidth="md">
        <PageHeader
          title="Compare reports"
          description="See how saved Portfolio X-Ray snapshots differ over time."
          action={
            <Button variant="ghost" size="sm" onClick={onBack}>
              ← Back
            </Button>
          }
        />
        <Card className="mb-6">
          <p className="text-sm text-slate-700 leading-relaxed mb-4">{copy.body}</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => { trackEvent("upgrade_prompt_clicked", { feature: "report_comparison" }); onViewPremium?.(); }}>{copy.primaryCta}</Button>
            <Button variant="secondary" onClick={onBack}>
              Back to dashboard
            </Button>
          </div>
        </Card>
        <Disclaimer extended="Educational only. Not financial advice. Comparisons use saved snapshot data only." />
      </PageLayout>
    );
  }

  function handleCompare() {
    const eRow = reports.find((r) => r.id === earlierId);
    const lRow = reports.find((r) => r.id === laterId);
    if (!eRow || !lRow) return;
    setEarlierData(rowToReportData(eRow));
    setLaterData(rowToReportData(lRow));
    setPhase("compare");
    trackEvent("report_compared");
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <PageLayout maxWidth="lg">
        <PageHeader title="Compare Reports" action={<Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>} />
        <p className="text-sm text-slate-400">Loading saved reports…</p>
      </PageLayout>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────

  if (phase === "error") {
    return (
      <PageLayout maxWidth="lg">
        <PageHeader title="Compare Reports" action={<Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>} />
        <p className="text-sm text-rose-500">Could not load saved reports. Please try again.</p>
      </PageLayout>
    );
  }

  // ── Empty ───────────────────────────────────────────────────────────────────

  if (phase === "empty") {
    return (
      <PageLayout maxWidth="lg">
        <PageHeader
          title="Compare Reports"
          description="Compare two saved Portfolio X-Ray reports to see changes over time."
          action={<Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>}
        />
        <EmptyState
          title="Not enough saved reports"
          description="Save at least two Portfolio Reports to compare changes in holdings, concentration, exposure, and portfolio value over time."
          action={{ label: "Open Portfolio X-Ray", onClick: onBack }}
        />
      </PageLayout>
    );
  }

  // ── Select ──────────────────────────────────────────────────────────────────

  if (phase === "select") {
    const canCompare = earlierId && laterId && earlierId !== laterId;

    return (
      <PageLayout maxWidth="lg">
        <PageHeader
          title="Compare Reports"
          description="Compare two saved Portfolio X-Ray reports to see changes in holdings, concentration, exposure, and portfolio value."
          action={<Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>}
        />

        <Card className="mb-6">
          <p className="text-sm font-semibold text-slate-800 mb-4">Select two reports to compare</p>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Earlier report
              </label>
              <select
                value={earlierId}
                onChange={(e) => setEarlierId(e.target.value)}
                className={selectClass}
              >
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {formatDate(r.created_at)} — {r.report_name ?? "Portfolio X-Ray"}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Later report
              </label>
              <select
                value={laterId}
                onChange={(e) => setLaterId(e.target.value)}
                className={selectClass}
              >
                {reports.map((r) => (
                  <option key={r.id} value={r.id}>
                    {formatDate(r.created_at)} — {r.report_name ?? "Portfolio X-Ray"}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {earlierId === laterId && earlierId !== "" && (
            <p className="text-xs text-rose-500 mt-3">Select two different reports to compare.</p>
          )}
          <div className="mt-4">
            <Button onClick={handleCompare} disabled={!canCompare}>
              Compare reports →
            </Button>
          </div>
        </Card>

        <Disclaimer extended="Educational only. Not financial advice. Report comparison is based on saved snapshot data and simplified exposure mappings." />
      </PageLayout>
    );
  }

  // ── Compare ─────────────────────────────────────────────────────────────────

  if (phase === "compare" && earlierData && laterData) {
    const result = computeReportComparison(earlierData, laterData);
    const {
      valueDelta,
      valueDeltaPct,
      holdingCountEarlier,
      holdingCountLater,
      holdingCountDelta,
      largestHoldingEarlier,
      largestHoldingLater,
      top3WeightEarlier,
      top3WeightLater,
      addedHoldings,
      removedHoldings,
      changedHoldings,
      assetTypeDiffs,
      sectorDiffs,
      geographyDiffs,
      currencyDiffs,
      insights,
    } = result;

    const increasedHoldings = changedHoldings.filter((h) => h.delta > 0);
    const decreasedHoldings = changedHoldings.filter((h) => h.delta < 0);

    const hasExposureChanges =
      assetTypeDiffs.some((d) => Math.abs(d.delta) >= 0.1) ||
      sectorDiffs.some((d) => Math.abs(d.delta) >= 0.1) ||
      geographyDiffs.some((d) => Math.abs(d.delta) >= 0.1) ||
      currencyDiffs.some((d) => Math.abs(d.delta) >= 0.1);

    return (
      <PageLayout maxWidth="lg">
        <PageHeader
          title="Report Comparison"
          action={
            <Button variant="ghost" size="sm" onClick={() => setPhase("select")}>
              ← Change reports
            </Button>
          }
        />

        {/* Report header */}
        <Card className="mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
                Earlier
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {earlierData.reportName ?? "Portfolio X-Ray"}
              </p>
              <p className="text-xs text-slate-400">{formatDate(earlierData.reportDate)}</p>
              <p className="text-sm font-bold text-slate-700 mt-1">{fmt(earlierData.totalValue)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
                Later
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {laterData.reportName ?? "Portfolio X-Ray"}
              </p>
              <p className="text-xs text-slate-400">{formatDate(laterData.reportDate)}</p>
              <p className="text-sm font-bold text-slate-700 mt-1">{fmt(laterData.totalValue)}</p>
            </div>
          </div>
        </Card>

        {/* Summary metrics */}
        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Summary</h2>
          <div className="grid grid-cols-2 gap-3">
            <SummaryMetric
              label="Portfolio value"
              earlier={fmt(earlierData.totalValue)}
              later={fmt(laterData.totalValue)}
              delta={
                valueDeltaPct !== null
                  ? `${signedVal(valueDelta)} (${signedPct(valueDeltaPct)})`
                  : signedVal(valueDelta)
              }
              deltaLabel={valueDelta > 0 ? "positive" : valueDelta < 0 ? "negative" : "neutral"}
            />
            <SummaryMetric
              label="Number of holdings"
              earlier={String(holdingCountEarlier)}
              later={String(holdingCountLater)}
              delta={
                holdingCountDelta !== 0
                  ? `${holdingCountDelta > 0 ? "+" : ""}${holdingCountDelta} holding${Math.abs(holdingCountDelta) === 1 ? "" : "s"}`
                  : "No change"
              }
              deltaLabel={holdingCountDelta > 0 ? "positive" : holdingCountDelta < 0 ? "negative" : "neutral"}
            />
            {largestHoldingEarlier && largestHoldingLater && (
              <SummaryMetric
                label="Largest holding"
                earlier={`${largestHoldingEarlier.label} — ${pct(largestHoldingEarlier.weight)}`}
                later={`${largestHoldingLater.label} — ${pct(largestHoldingLater.weight)}`}
                delta={(() => {
                  const d = largestHoldingLater.weight - largestHoldingEarlier.weight;
                  return Math.abs(d) >= 0.1 ? `${d > 0 ? "+" : ""}${d.toFixed(1)} pp` : "No change";
                })()}
                deltaLabel={
                  largestHoldingLater.weight > largestHoldingEarlier.weight + 0.1
                    ? "negative"
                    : largestHoldingLater.weight < largestHoldingEarlier.weight - 0.1
                    ? "positive"
                    : "neutral"
                }
              />
            )}
            {top3WeightEarlier !== null && top3WeightLater !== null && (
              <SummaryMetric
                label="Top 3 concentration"
                earlier={pct(top3WeightEarlier)}
                later={pct(top3WeightLater)}
                delta={(() => {
                  const d = top3WeightLater - top3WeightEarlier;
                  return Math.abs(d) >= 0.1 ? `${d > 0 ? "+" : ""}${d.toFixed(1)} pp` : "No change";
                })()}
                deltaLabel={
                  top3WeightLater > top3WeightEarlier + 0.1
                    ? "negative"
                    : top3WeightLater < top3WeightEarlier - 0.1
                    ? "positive"
                    : "neutral"
                }
              />
            )}
          </div>
        </div>

        {/* Holdings changes */}
        {(addedHoldings.length > 0 ||
          removedHoldings.length > 0 ||
          changedHoldings.length > 0) && (
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Holding changes</h2>
            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Market value changed between reports. This may reflect contributions, withdrawals,
              price movement, or manual entry differences.
            </p>
            <div className="space-y-3">
              {addedHoldings.length > 0 && (
                <Card padding="sm">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-semibold text-slate-600">Added</p>
                    <Badge variant="success">{addedHoldings.length}</Badge>
                  </div>
                  <div className="space-y-1">
                    {addedHoldings.map((h) => (
                      <div key={h.key} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                        <span className="font-semibold text-slate-700">{h.ticker || h.name || "Unknown"}</span>
                        {h.ticker && h.name && <span className="text-slate-400 flex-1 px-2 truncate">{h.name}</span>}
                        <span className="text-teal-600 font-semibold">{fmt(h.value)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {removedHoldings.length > 0 && (
                <Card padding="sm">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-semibold text-slate-600">No longer present</p>
                    <Badge variant="muted">{removedHoldings.length}</Badge>
                  </div>
                  <div className="space-y-1">
                    {removedHoldings.map((h) => (
                      <div key={h.key} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-0">
                        <span className="font-semibold text-slate-700">{h.ticker || h.name || "Unknown"}</span>
                        {h.ticker && h.name && <span className="text-slate-400 flex-1 px-2 truncate">{h.name}</span>}
                        <span className="text-slate-500">{fmt(h.value)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {increasedHoldings.length > 0 && (
                <Card padding="sm">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-semibold text-slate-600">Increased market value</p>
                    <Badge variant="success">{increasedHoldings.length}</Badge>
                  </div>
                  {increasedHoldings.sort((a, b) => b.delta - a.delta).map((h: HoldingChange) => (
                    <HoldingChangeRow key={h.key} hc={h} />
                  ))}
                </Card>
              )}

              {decreasedHoldings.length > 0 && (
                <Card padding="sm">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-xs font-semibold text-slate-600">Decreased market value</p>
                    <Badge variant="caution">{decreasedHoldings.length}</Badge>
                  </div>
                  {[...decreasedHoldings].sort((a, b) => a.delta - b.delta).map((h: HoldingChange) => (
                    <HoldingChangeRow key={h.key} hc={h} />
                  ))}
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Exposure changes */}
        {hasExposureChanges && (
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">Exposure changes</h2>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Simplified estimates based on saved report data. pp = percentage points.
            </p>
            <ExposureSection title="Asset type" diffs={assetTypeDiffs} />
            <ExposureSection title="Sector" diffs={sectorDiffs} />
            <ExposureSection title="Geography" diffs={geographyDiffs} />
            <ExposureSection title="Currency" diffs={currencyDiffs} />
          </div>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div className="mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-1">
              Comparison insights
            </h2>
            <p className="text-sm text-slate-500 mb-3">
              Based on saved report data. Educational only.
            </p>
            <div className="space-y-4">
              {insights.map((ins) => (
                <Card key={ins.id}>
                  <div className="mb-2">
                    <Badge variant="info">Worth noting</Badge>
                  </div>
                  <p className="text-sm font-semibold text-slate-800 mb-1">{ins.title}</p>
                  <p className="text-sm text-slate-600 leading-relaxed mb-4">
                    {ins.description}
                  </p>
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                      Evidence
                    </p>
                    <div className="space-y-1.5">
                      {ins.evidence.map((ev) => (
                        <div key={ev.label} className="flex items-baseline gap-2 text-xs">
                          <span className="font-semibold text-slate-500 shrink-0">
                            {ev.label}:
                          </span>
                          <span className="text-slate-600">{ev.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* No notable changes */}
        {insights.length === 0 &&
          addedHoldings.length === 0 &&
          removedHoldings.length === 0 &&
          changedHoldings.length === 0 && (
          <Card className="mb-6" variant="highlighted">
            <p className="text-sm text-blue-900 leading-relaxed">
              No notable differences were found between these two reports based on the comparison
              thresholds. The portfolios appear similar in holdings, concentration, and exposure.
            </p>
          </Card>
        )}

        {/* AI Coach */}
        {onAskCoach && (
          <div className="mb-6">
            <button
              onClick={() => {
                const question = buildComparisonCoachQuestion(earlierData, laterData, result);
                const ctx: PortfolioContext = {
                  reportName: laterData.reportName ?? undefined,
                  savedAt: laterData.reportDate,
                  totalValue: laterData.totalValue,
                  currency: "CAD",
                  holdings: laterData.holdings
                    .sort((a, b) => b.marketValue - a.marketValue)
                    .map((h) => ({
                      ticker: h.ticker,
                      name: h.name,
                      assetType: h.assetType,
                      marketValue: h.marketValue,
                      weight:
                        laterData.totalValue > 0
                          ? (h.marketValue / laterData.totalValue) * 100
                          : 0,
                    })),
                  assetMix: laterData.assetMix.map((m) => ({
                    assetType: m.assetType,
                    weight: m.weight,
                  })),
                  sectorExposure: laterData.sectorExposure,
                  geographyExposure: laterData.geographyExposure,
                  currencyExposure: laterData.currencyExposure,
                };
                onAskCoach(question, ctx);
              }}
              className="w-full flex items-center justify-center gap-2 text-sm font-medium text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 px-4 py-3 rounded-2xl cursor-pointer transition-colors"
            >
              <span>✦</span>
              Ask AI Portfolio Coach to explain this comparison
            </button>
          </div>
        )}

        <Disclaimer extended="Educational only. Not financial advice. Report comparison is based on saved snapshot data and simplified exposure mappings. Changes in values may reflect contributions, withdrawals, price movement, or manual entry differences — not investment performance." />
      </PageLayout>
    );
  }

  return null;
}
