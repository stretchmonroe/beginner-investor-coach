import type { PortfolioReportData } from "@/lib/portfolioReports";
import type { Holding } from "@/types/portfolio";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExposureDiff {
  label: string;
  earlier: number;
  later: number;
  delta: number; // percentage points: later - earlier
}

export interface HoldingChange {
  key: string;
  ticker: string;
  name: string;
  earlierValue: number;
  laterValue: number;
  delta: number;
}

export interface ComparisonInsight {
  id: string;
  title: string;
  description: string;
  evidence: Array<{ label: string; value: string }>;
}

export interface ReportComparisonResult {
  valueDelta: number;
  valueDeltaPct: number | null;
  holdingCountEarlier: number;
  holdingCountLater: number;
  holdingCountDelta: number;

  largestHoldingEarlier: { label: string; weight: number } | null;
  largestHoldingLater: { label: string; weight: number } | null;
  top3WeightEarlier: number | null;
  top3WeightLater: number | null;

  addedHoldings: Array<{ key: string; ticker: string; name: string; value: number }>;
  removedHoldings: Array<{ key: string; ticker: string; name: string; value: number }>;
  changedHoldings: HoldingChange[];

  assetTypeDiffs: ExposureDiff[];
  sectorDiffs: ExposureDiff[];
  geographyDiffs: ExposureDiff[];
  currencyDiffs: ExposureDiff[];

  insights: ComparisonInsight[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function holdingKey(h: Holding): string {
  const t = h.ticker?.trim().toUpperCase();
  if (t) return `T:${t}`;
  const n = h.name?.trim().toLowerCase();
  if (n) return `N:${n}`;
  return `ID:${h.id}`;
}

function getLargest(
  holdings: Holding[],
  totalValue: number
): { label: string; weight: number } | null {
  if (!holdings.length || totalValue <= 0) return null;
  const sorted = [...holdings].sort((a, b) => b.marketValue - a.marketValue);
  return {
    label: sorted[0].ticker || sorted[0].name,
    weight: (sorted[0].marketValue / totalValue) * 100,
  };
}

function getTop3Weight(holdings: Holding[], totalValue: number): number | null {
  if (holdings.length < 3 || totalValue <= 0) return null;
  const sorted = [...holdings].sort((a, b) => b.marketValue - a.marketValue);
  return (sorted.slice(0, 3).reduce((s, h) => s + h.marketValue, 0) / totalValue) * 100;
}

function diffExposure(
  earlier: Array<{ label: string; weight: number }>,
  later: Array<{ label: string; weight: number }>
): ExposureDiff[] {
  const em = new Map(earlier.map((e) => [e.label, e.weight]));
  const lm = new Map(later.map((l) => [l.label, l.weight]));
  const labels = new Set([...em.keys(), ...lm.keys()]);
  const diffs: ExposureDiff[] = [];
  for (const label of labels) {
    const e = em.get(label) ?? 0;
    const l = lm.get(label) ?? 0;
    diffs.push({ label, earlier: e, later: l, delta: l - e });
  }
  return diffs.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtVal(n: number): string {
  return "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtPct(n: number): string {
  return n.toFixed(1) + "%";
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function computeReportComparison(
  earlier: PortfolioReportData,
  later: PortfolioReportData
): ReportComparisonResult {
  const v1 = earlier.totalValue;
  const v2 = later.totalValue;
  const valueDelta = v2 - v1;
  const valueDeltaPct = v1 > 0 ? (valueDelta / v1) * 100 : null;

  const h1 = earlier.holdings ?? [];
  const h2 = later.holdings ?? [];

  const map1 = new Map<string, Holding>();
  for (const h of h1) map1.set(holdingKey(h), h);
  const map2 = new Map<string, Holding>();
  for (const h of h2) map2.set(holdingKey(h), h);

  const added: ReportComparisonResult["addedHoldings"] = [];
  const removed: ReportComparisonResult["removedHoldings"] = [];
  const changed: HoldingChange[] = [];

  for (const [key, h] of map2) {
    if (!map1.has(key)) {
      added.push({ key, ticker: h.ticker, name: h.name, value: h.marketValue });
    }
  }

  for (const [key, h] of map1) {
    if (!map2.has(key)) {
      removed.push({ key, ticker: h.ticker, name: h.name, value: h.marketValue });
    }
  }

  for (const [key, ha] of map1) {
    const hb = map2.get(key);
    if (hb && ha.marketValue !== hb.marketValue) {
      changed.push({
        key,
        ticker: ha.ticker || hb.ticker,
        name: ha.name || hb.name,
        earlierValue: ha.marketValue,
        laterValue: hb.marketValue,
        delta: hb.marketValue - ha.marketValue,
      });
    }
  }
  changed.sort((a, b) => a.delta - b.delta);

  const largestEarlier = getLargest(h1, v1);
  const largestLater = getLargest(h2, v2);
  const top3Earlier = getTop3Weight(h1, v1);
  const top3Later = getTop3Weight(h2, v2);

  const assetTypeDiffs = diffExposure(
    earlier.assetMix.map((m) => ({ label: m.assetType, weight: m.weight })),
    later.assetMix.map((m) => ({ label: m.assetType, weight: m.weight }))
  );
  const sectorDiffs = diffExposure(earlier.sectorExposure, later.sectorExposure);
  const geographyDiffs = diffExposure(earlier.geographyExposure, later.geographyExposure);
  const currencyDiffs = diffExposure(earlier.currencyExposure, later.currencyExposure);

  // ── Insights ────────────────────────────────────────────────────────────────

  const insights: ComparisonInsight[] = [];

  if (valueDeltaPct !== null && Math.abs(valueDeltaPct) >= 10) {
    const dir = valueDelta > 0 ? "increased" : "decreased";
    insights.push({
      id: "value-change",
      title: `Portfolio value ${dir} by ${Math.abs(valueDeltaPct).toFixed(1)}%`,
      description:
        "The total portfolio value changed between these two reports. This may reflect contributions, withdrawals, market price changes, or differences in manually entered values.",
      evidence: [
        { label: "Earlier value", value: `${fmtVal(v1)} (${fmtDate(earlier.reportDate)})` },
        { label: "Later value", value: `${fmtVal(v2)} (${fmtDate(later.reportDate)})` },
        { label: "Change", value: `${valueDelta > 0 ? "+" : ""}${fmtVal(Math.abs(valueDelta))}` },
        { label: "Source", value: "Based on saved report data" },
      ],
    });
  }

  if (largestEarlier && largestLater) {
    const deltaW = largestLater.weight - largestEarlier.weight;
    if (Math.abs(deltaW) >= 5) {
      insights.push({
        id: "largest-concentration",
        title:
          deltaW > 0
            ? "Largest holding concentration increased"
            : "Largest holding concentration decreased",
        description:
          deltaW > 0
            ? "The largest holding makes up a larger share of the portfolio in the newer report. Concentration increasing in a single position may be worth understanding."
            : "The largest holding makes up a smaller share of the portfolio in the newer report. This may reflect added diversification or a reduced position.",
        evidence: [
          {
            label: "Earlier",
            value: `${largestEarlier.label} — ${fmtPct(largestEarlier.weight)} (${fmtDate(earlier.reportDate)})`,
          },
          {
            label: "Later",
            value: `${largestLater.label} — ${fmtPct(largestLater.weight)} (${fmtDate(later.reportDate)})`,
          },
          {
            label: "Change",
            value: `${deltaW > 0 ? "+" : ""}${deltaW.toFixed(1)} percentage points`,
          },
          { label: "Source", value: "Based on saved report data" },
        ],
      });
    }
  }

  if (top3Earlier !== null && top3Later !== null) {
    const deltaW = top3Later - top3Earlier;
    if (Math.abs(deltaW) >= 5) {
      insights.push({
        id: "top3-concentration",
        title:
          deltaW > 0
            ? "Top holdings became more concentrated"
            : "Top holdings became less concentrated",
        description:
          deltaW > 0
            ? "The top 3 holdings account for a larger share of the portfolio in the newer report. This may be worth understanding in terms of concentration."
            : "The top 3 holdings account for a smaller share of the portfolio in the newer report, which may indicate added diversification.",
        evidence: [
          { label: "Earlier", value: `Top 3 = ${fmtPct(top3Earlier)} (${fmtDate(earlier.reportDate)})` },
          { label: "Later", value: `Top 3 = ${fmtPct(top3Later)} (${fmtDate(later.reportDate)})` },
          { label: "Change", value: `${deltaW > 0 ? "+" : ""}${deltaW.toFixed(1)} percentage points` },
          { label: "Source", value: "Based on saved report data" },
        ],
      });
    }
  }

  if (added.length > 0) {
    insights.push({
      id: "holdings-added",
      title: `${added.length} new holding${added.length === 1 ? "" : "s"} appeared`,
      description:
        "The newer report contains holdings not present in the earlier report. This may reflect new purchases, transfers, or holdings that were manually re-entered.",
      evidence: [
        { label: "Added", value: added.map((h) => h.ticker || h.name).join(", ") },
        { label: "Source", value: "Based on saved report data" },
      ],
    });
  }

  if (removed.length > 0) {
    insights.push({
      id: "holdings-removed",
      title: `${removed.length} holding${removed.length === 1 ? "" : "s"} no longer present`,
      description:
        "Some holdings from the earlier report are not in the newer report. This may reflect sales, transfers, or holdings that were not re-entered.",
      evidence: [
        { label: "Removed", value: removed.map((h) => h.ticker || h.name).join(", ") },
        { label: "Source", value: "Based on saved report data" },
      ],
    });
  }

  return {
    valueDelta,
    valueDeltaPct,
    holdingCountEarlier: h1.length,
    holdingCountLater: h2.length,
    holdingCountDelta: h2.length - h1.length,
    largestHoldingEarlier: largestEarlier,
    largestHoldingLater: largestLater,
    top3WeightEarlier: top3Earlier,
    top3WeightLater: top3Later,
    addedHoldings: added,
    removedHoldings: removed,
    changedHoldings: changed,
    assetTypeDiffs,
    sectorDiffs,
    geographyDiffs,
    currencyDiffs,
    insights,
  };
}

// ─── Coach question builder ───────────────────────────────────────────────────

export function buildComparisonCoachQuestion(
  earlier: PortfolioReportData,
  later: PortfolioReportData,
  result: ReportComparisonResult
): string {
  const lines: string[] = [
    "Explain the differences between these two saved Portfolio X-Ray reports in plain English.",
    "",
    `Earlier report (${fmtDate(earlier.reportDate)}): ${earlier.reportName ?? "Portfolio X-Ray"}`,
    `  Total value: ${fmtVal(earlier.totalValue)}`,
    `  Holdings: ${result.holdingCountEarlier}`,
    result.largestHoldingEarlier
      ? `  Largest holding: ${result.largestHoldingEarlier.label} at ${fmtPct(result.largestHoldingEarlier.weight)}`
      : "",
    result.top3WeightEarlier !== null
      ? `  Top 3 concentration: ${fmtPct(result.top3WeightEarlier)}`
      : "",
    "",
    `Later report (${fmtDate(later.reportDate)}): ${later.reportName ?? "Portfolio X-Ray"}`,
    `  Total value: ${fmtVal(later.totalValue)}`,
    `  Holdings: ${result.holdingCountLater}`,
    result.largestHoldingLater
      ? `  Largest holding: ${result.largestHoldingLater.label} at ${fmtPct(result.largestHoldingLater.weight)}`
      : "",
    result.top3WeightLater !== null
      ? `  Top 3 concentration: ${fmtPct(result.top3WeightLater)}`
      : "",
    "",
    "Changes:",
    `  Portfolio value: ${result.valueDelta > 0 ? "+" : ""}${fmtVal(result.valueDelta)}${result.valueDeltaPct !== null ? ` (${result.valueDeltaPct > 0 ? "+" : ""}${result.valueDeltaPct.toFixed(1)}%)` : ""}`,
    `  Holdings: ${result.holdingCountDelta > 0 ? "+" : ""}${result.holdingCountDelta}`,
    result.addedHoldings.length > 0
      ? `  Added: ${result.addedHoldings.map((h) => h.ticker || h.name).join(", ")}`
      : "",
    result.removedHoldings.length > 0
      ? `  Removed: ${result.removedHoldings.map((h) => h.ticker || h.name).join(", ")}`
      : "",
    "",
    "Focus on changes in portfolio value, concentration, holdings, and exposure. Use cautious language. Note that changes may reflect contributions, withdrawals, price changes, or manual entry differences. Do not give buy/sell advice.",
  ];
  return lines.filter((l) => l !== undefined).join("\n").trim();
}
