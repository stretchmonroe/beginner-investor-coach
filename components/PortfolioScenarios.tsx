"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import type { Holding, AssetType } from "@/types/portfolio";
import type { ExposureItem } from "@/lib/portfolioMetadata";
import Card from "@/components/ui/Card";
import Disclaimer from "@/components/ui/Disclaimer";

// ─── Constants ────────────────────────────────────────────────────────────────

const BROAD_ETF_TICKERS = new Set(["XEQT", "VEQT", "VGRO", "VBAL", "VFV", "XUU"]);
const EXCHANGE_SUFFIX_RE = /\.(TO|V|CN|NE)$/i;

type ContributionTarget = "proportional" | "cash" | "broad-etf" | "manual";

const CONTRIB_TARGET_LABELS: Record<ContributionTarget, string> = {
  proportional: "Add proportionally to current holdings",
  cash: "Add to cash-like holdings",
  "broad-etf": "Add to broad ETF holdings",
  manual: "Add to one selected holding",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(v: number): string {
  return "$" + v.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct(v: number): string { return v.toFixed(1) + "%"; }
function normalizeTicker(t: string): string {
  return t.toUpperCase().replace(EXCHANGE_SUFFIX_RE, "");
}

// ─── Computation types ────────────────────────────────────────────────────────

interface HoldingRow {
  id: string;
  ticker: string;
  name: string;
  assetType: AssetType;
  prevValue: number;
  added: number;
  newValue: number;
  prevWeight: number;
  newWeight: number;
  delta: number;
}

interface ContribResult {
  kind: "result";
  totalContrib: number;
  newTotal: number;
  rows: HoldingRow[];
  largestLabel: string;
  largestWeightAfter: number;
  top3WeightAfter: number;
  biggestChangeLabel: string;
  biggestChangePrev: number;
  biggestChangeNew: number;
  assetMixAfter: { assetType: AssetType; value: number; weight: number }[];
}

interface ContribWarning {
  kind: "warning";
  message: string;
}

interface DropResult {
  label: string;
  prevValue: number;
  dollarLoss: number;
  newHoldingValue: number;
  newTotal: number;
  portfolioDeclPct: number;
  newWeight: number;
  remainsLargest: boolean;
}

interface SectorDropResult {
  sector: string;
  mappedValue: number;
  mappedPct: number;
  dollarLoss: number;
  newTotal: number;
  portfolioDeclPct: number;
}

// ─── Computation functions ────────────────────────────────────────────────────

function computeContribution(
  holdings: Holding[],
  totalValue: number,
  amount: number,
  months: number,
  target: ContributionTarget,
  manualId: string
): ContribResult | ContribWarning | null {
  if (amount <= 0 || months <= 0 || holdings.length === 0) return null;

  const totalContrib = amount * months;
  let targets: Holding[];

  if (target === "cash") {
    targets = holdings.filter((h) => h.assetType === "Cash");
    if (targets.length === 0)
      return {
        kind: "warning",
        message:
          "No cash-like holding was entered. You can still model this by adding a cash holding first.",
      };
  } else if (target === "broad-etf") {
    targets = holdings.filter((h) => BROAD_ETF_TICKERS.has(normalizeTicker(h.ticker)));
    if (targets.length === 0)
      return {
        kind: "warning",
        message:
          "No broad ETF holding was entered. You can still model this by selecting a holding manually.",
      };
  } else if (target === "manual") {
    const found = holdings.find((h) => h.id === manualId);
    if (!found) return null;
    targets = [found];
  } else {
    targets = holdings;
  }

  const subTotal = targets.reduce((s, h) => s + h.marketValue, 0);
  const additions = new Map<string, number>();

  if (subTotal > 0) {
    for (const h of targets) additions.set(h.id, totalContrib * (h.marketValue / subTotal));
  } else {
    const each = totalContrib / targets.length;
    for (const h of targets) additions.set(h.id, each);
  }

  const newTotal = totalValue + totalContrib;

  const rows: HoldingRow[] = holdings.map((h) => {
    const added = additions.get(h.id) ?? 0;
    const newValue = h.marketValue + added;
    const prevWeight = totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0;
    const newWeight = newTotal > 0 ? (newValue / newTotal) * 100 : 0;
    return {
      id: h.id,
      ticker: h.ticker,
      name: h.name,
      assetType: h.assetType,
      prevValue: h.marketValue,
      added,
      newValue,
      prevWeight,
      newWeight,
      delta: newWeight - prevWeight,
    };
  });

  const sortedRows = [...rows].sort((a, b) => b.newValue - a.newValue);
  const largest = sortedRows[0];
  const top3Weight = sortedRows.slice(0, 3).reduce((s, r) => s + r.newWeight, 0);
  const biggestChange = [...rows].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];

  const byType: Partial<Record<AssetType, number>> = {};
  for (const r of rows) byType[r.assetType] = (byType[r.assetType] ?? 0) + r.newValue;
  const assetMixAfter = (Object.entries(byType) as [AssetType, number][])
    .map(([assetType, value]) => ({ assetType, value, weight: (value / newTotal) * 100 }))
    .sort((a, b) => b.weight - a.weight);

  return {
    kind: "result",
    totalContrib,
    newTotal,
    rows,
    largestLabel: largest.ticker || largest.name,
    largestWeightAfter: largest.newWeight,
    top3WeightAfter: top3Weight,
    biggestChangeLabel: biggestChange.ticker || biggestChange.name,
    biggestChangePrev: biggestChange.prevWeight,
    biggestChangeNew: biggestChange.newWeight,
    assetMixAfter,
  };
}

function computeHoldingDrop(
  holdings: Holding[],
  totalValue: number,
  holdingId: string,
  dropPct: number
): DropResult | null {
  if (!holdingId || dropPct <= 0 || dropPct > 100 || holdings.length === 0) return null;
  const h = holdings.find((x) => x.id === holdingId);
  if (!h) return null;

  const dollarLoss = h.marketValue * (dropPct / 100);
  const newHoldingValue = h.marketValue - dollarLoss;
  const newTotal = totalValue - dollarLoss;
  const portfolioDeclPct = totalValue > 0 ? (dollarLoss / totalValue) * 100 : 0;
  const newWeight = newTotal > 0 ? (newHoldingValue / newTotal) * 100 : 0;
  const otherMax = holdings
    .filter((x) => x.id !== holdingId)
    .reduce((m, x) => Math.max(m, x.marketValue), 0);

  return {
    label: h.ticker || h.name,
    prevValue: h.marketValue,
    dollarLoss,
    newHoldingValue,
    newTotal,
    portfolioDeclPct,
    newWeight,
    remainsLargest: newHoldingValue >= otherMax,
  };
}

function computeSectorDrop(
  sectorExposure: ExposureItem[],
  totalValue: number,
  sector: string,
  dropPct: number
): SectorDropResult | null {
  if (!sector || dropPct <= 0 || dropPct > 100 || totalValue === 0) return null;
  const item = sectorExposure.find((s) => s.label === sector);
  if (!item) return null;

  const dollarLoss = item.value * (dropPct / 100);
  return {
    sector,
    mappedValue: item.value,
    mappedPct: item.weight,
    dollarLoss,
    newTotal: totalValue - dollarLoss,
    portfolioDeclPct: totalValue > 0 ? (dollarLoss / totalValue) * 100 : 0,
  };
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

function EvidencePanel({ items }: { items: { label: string; value: string }[] }) {
  return (
    <div className="border-t border-slate-100 pt-3 mt-4">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Evidence</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div key={i} className="flex items-baseline gap-2 text-xs">
            <span className="font-semibold text-slate-500 shrink-0">{item.label}:</span>
            <span className="text-slate-600">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function WhatThisMeans({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
      <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-1.5">
        What this means
      </p>
      <p className="text-sm text-blue-900 leading-relaxed">{children}</p>
    </div>
  );
}

function ResultRow({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-slate-50 last:border-b-0">
      <span className="text-xs text-slate-500 shrink-0">{label}</span>
      <div className="text-right">
        <span className="text-sm font-semibold text-slate-800">{value}</span>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function WarningNote({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
      <p className="text-xs text-amber-700">{message}</p>
    </div>
  );
}

const inputClass =
  "w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white";
const labelClass = "block text-xs font-medium text-slate-500 mb-1";

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  holdings: Holding[];
  totalValue: number;
  sectorExposure: ExposureItem[];
  defaultMonthlyContribution?: number;
  onAskCoach?: (question: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PortfolioScenarios({
  holdings,
  totalValue,
  sectorExposure,
  defaultMonthlyContribution,
  onAskCoach,
}: Props) {
  const [contribAmount, setContribAmount] = useState(defaultMonthlyContribution ?? 1250);
  const [contribMonths, setContribMonths] = useState(12);
  const [contribTarget, setContribTarget] = useState<ContributionTarget>("proportional");
  const [contribHoldingId, setContribHoldingId] = useState("");

  const [dropHoldingId, setDropHoldingId] = useState("");
  const [dropPct, setDropPct] = useState(30);

  const [sectorName, setSectorName] = useState("");
  const [sectorDropPct, setSectorDropPct] = useState(20);

  // Derived defaults
  const sortedByValue = [...holdings].sort((a, b) => b.marketValue - a.marketValue);
  const effectiveDropId = dropHoldingId || sortedByValue[0]?.id || "";
  const mappedSectors = sectorExposure.filter((s) => s.label !== "Unknown");
  const effectiveSector = sectorName || mappedSectors[0]?.label || "";

  // Computed results
  const contrib = computeContribution(
    holdings,
    totalValue,
    contribAmount,
    contribMonths,
    contribTarget,
    contribHoldingId
  );
  const drop = computeHoldingDrop(holdings, totalValue, effectiveDropId, dropPct);
  const secDrop = computeSectorDrop(sectorExposure, totalValue, effectiveSector, sectorDropPct);

  return (
    <div className="mb-6">
      <h2 className="text-base font-semibold text-slate-800 mb-1">Portfolio Scenarios</h2>
      <p className="text-sm text-slate-500 mb-4">
        Explore what could happen if you add money monthly or if one part of your portfolio drops
        in value.
      </p>

      {holdings.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 text-center py-2">
            Add holdings above to explore scenarios.
          </p>
        </Card>
      ) : (
        <>
          {/* ── Scenario 1: Monthly contribution ────────────────────────── */}
          <Card className="mb-4">
            <p className="text-sm font-semibold text-slate-800 mb-0.5">
              Scenario 1 — Monthly contribution
            </p>
            <p className="text-xs text-slate-500 mb-4">
              What if you add a set amount each month?
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className={labelClass}>Monthly amount ($)</label>
                <input
                  type="number"
                  min={1}
                  value={contribAmount}
                  onChange={(e) =>
                    setContribAmount(Math.max(1, parseFloat(e.target.value) || 1))
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Months</label>
                <input
                  type="number"
                  min={1}
                  max={360}
                  value={contribMonths}
                  onChange={(e) =>
                    setContribMonths(
                      Math.max(1, Math.min(360, parseInt(e.target.value, 10) || 1))
                    )
                  }
                  className={inputClass}
                />
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Contribution target</label>
                <select
                  value={contribTarget}
                  onChange={(e) => setContribTarget(e.target.value as ContributionTarget)}
                  className={inputClass}
                >
                  {(
                    Object.entries(CONTRIB_TARGET_LABELS) as [ContributionTarget, string][]
                  ).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              {contribTarget === "manual" && (
                <div className="col-span-2">
                  <label className={labelClass}>Select holding</label>
                  <select
                    value={contribHoldingId}
                    onChange={(e) => setContribHoldingId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">— Select holding —</option>
                    {holdings.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.ticker || h.name} ({fmt(h.marketValue)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {contrib?.kind === "warning" && <WarningNote message={contrib.message} />}

            {contrib?.kind === "result" && (
              <>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                  Result
                </p>

                <div className="mb-4">
                  <ResultRow label="Total contributions added" value={fmt(contrib.totalContrib)} />
                  <ResultRow
                    label="New estimated portfolio value"
                    value={fmt(contrib.newTotal)}
                    sub="Contributions only — no expected return applied"
                  />
                  <ResultRow
                    label="Largest holding after"
                    value={`${contrib.largestLabel} — ${pct(contrib.largestWeightAfter)}`}
                  />
                  {holdings.length >= 3 && (
                    <ResultRow
                      label="Top 3 concentration after"
                      value={pct(contrib.top3WeightAfter)}
                    />
                  )}
                  <ResultRow
                    label="Biggest weight change"
                    value={`${contrib.biggestChangeLabel}`}
                    sub={`${pct(contrib.biggestChangePrev)} → ${pct(contrib.biggestChangeNew)}`}
                  />
                </div>

                {/* Updated weights */}
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Updated weights
                </p>
                <div className="space-y-1.5 mb-4">
                  {[...contrib.rows]
                    .sort((a, b) => b.newValue - a.newValue)
                    .map((r) => (
                      <div key={r.id} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 truncate mr-2">
                          {r.ticker || r.name}
                        </span>
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <span className="text-slate-400">{pct(r.prevWeight)}</span>
                          <span className="text-slate-300">→</span>
                          <span className="text-slate-800 font-semibold">{pct(r.newWeight)}</span>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Asset type mix after */}
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
                  Asset type after
                </p>
                <div className="space-y-2 mb-2">
                  {contrib.assetMixAfter.map((m) => (
                    <div key={m.assetType} className="flex items-center gap-3">
                      <span className="text-xs text-slate-600 w-24 shrink-0">{m.assetType}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-400"
                          style={{ width: `${Math.min(m.weight, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600 w-10 text-right shrink-0">
                        {pct(m.weight)}
                      </span>
                    </div>
                  ))}
                </div>

                <WhatThisMeans>
                  This scenario shows how future contributions could change portfolio weights.
                  Adding proportionally keeps the mix similar to today, while adding to one
                  holding increases its concentration over time. No expected return is applied —
                  this models allocation only.
                </WhatThisMeans>

                <EvidencePanel
                  items={[
                    { label: "Monthly contribution", value: fmt(contribAmount) },
                    {
                      label: "Contribution length",
                      value: `${contribMonths} ${contribMonths === 1 ? "month" : "months"}`,
                    },
                    { label: "Target", value: CONTRIB_TARGET_LABELS[contribTarget] },
                    { label: "Return assumption", value: "None — contributions only" },
                    { label: "Source", value: "Manually entered holdings" },
                  ]}
                />
              </>
            )}
          </Card>

          {/* ── Scenario 2: Holding drop ─────────────────────────────────── */}
          <Card className="mb-4">
            <p className="text-sm font-semibold text-slate-800 mb-0.5">
              Scenario 2 — Holding drop
            </p>
            <p className="text-xs text-slate-500 mb-4">
              What if one holding falls by a certain percentage?
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="col-span-2">
                <label className={labelClass}>Select holding</label>
                <select
                  value={effectiveDropId}
                  onChange={(e) => setDropHoldingId(e.target.value)}
                  className={inputClass}
                >
                  {sortedByValue.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.ticker || h.name} — {fmt(h.marketValue)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelClass}>Drop percentage (%)</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={dropPct}
                  onChange={(e) =>
                    setDropPct(Math.max(1, Math.min(99, parseFloat(e.target.value) || 1)))
                  }
                  className={inputClass}
                />
              </div>
            </div>

            {drop && (
              <>
                {/* Plain-English summary */}
                <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 mb-4">
                  <p className="text-sm text-rose-800 leading-relaxed">
                    If <strong>{drop.label}</strong> drops {pct(dropPct)}, its value would fall
                    by approximately <strong>{fmt(drop.dollarLoss)}</strong> and the portfolio
                    value would fall by approximately{" "}
                    <strong>{pct(drop.portfolioDeclPct)}</strong>, based on the holdings entered.
                  </p>
                </div>

                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                  Result
                </p>
                <div className="mb-4">
                  <ResultRow label="Selected holding" value={drop.label} />
                  <ResultRow label="Drop assumption" value={pct(dropPct)} />
                  <ResultRow label="Estimated dollar impact" value={`−${fmt(drop.dollarLoss)}`} />
                  <ResultRow
                    label="Estimated portfolio impact"
                    value={`−${pct(drop.portfolioDeclPct)}`}
                  />
                  <ResultRow label="New holding value" value={fmt(drop.newHoldingValue)} />
                  <ResultRow label="New portfolio value" value={fmt(drop.newTotal)} />
                  <ResultRow
                    label="Holding weight after"
                    value={pct(drop.newWeight)}
                    sub={`was ${pct((drop.prevValue / totalValue) * 100)}`}
                  />
                  <ResultRow
                    label="Remains largest holding"
                    value={drop.remainsLargest ? "Yes" : "No"}
                  />
                </div>

                <WhatThisMeans>
                  This scenario helps you understand how much the portfolio depends on one
                  holding. A larger position creates a larger portfolio impact when it moves
                  sharply. This is an educational what-if — not a prediction.
                </WhatThisMeans>

                <EvidencePanel
                  items={[
                    { label: "Selected holding", value: drop.label },
                    { label: "Holding value", value: fmt(drop.prevValue) },
                    { label: "Drop assumption", value: `${pct(dropPct)} hypothetical decline` },
                    { label: "Source", value: "Manually entered holdings" },
                    { label: "Note", value: "What-if scenario only. Not a prediction." },
                  ]}
                />
              </>
            )}
          </Card>

          {/* ── Scenario 3: Sector drop ──────────────────────────────────── */}
          <Card className="mb-4">
            <p className="text-sm font-semibold text-slate-800 mb-0.5">
              Scenario 3 — Sector drop
            </p>
            <p className="text-xs text-slate-500 mb-4">
              What if a mapped sector falls by a certain percentage?
            </p>

            {mappedSectors.length === 0 ? (
              <WarningNote message="No sector mapping is available for the holdings entered. Add holdings with local metadata to explore sector scenarios." />
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="col-span-2">
                    <label className={labelClass}>Select sector</label>
                    <select
                      value={effectiveSector}
                      onChange={(e) => setSectorName(e.target.value)}
                      className={inputClass}
                    >
                      {mappedSectors.map((s) => (
                        <option key={s.label} value={s.label}>
                          {s.label} — {pct(s.weight)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className={labelClass}>Drop percentage (%)</label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={sectorDropPct}
                      onChange={(e) =>
                        setSectorDropPct(
                          Math.max(1, Math.min(99, parseFloat(e.target.value) || 1))
                        )
                      }
                      className={inputClass}
                    />
                  </div>
                </div>

                {secDrop && (
                  <>
                    {/* Plain-English summary */}
                    <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-3 mb-4">
                      <p className="text-sm text-rose-800 leading-relaxed">
                        If <strong>{secDrop.sector}</strong> drops {pct(sectorDropPct)}, the
                        mapped portfolio exposure would fall by approximately{" "}
                        <strong>{fmt(secDrop.dollarLoss)}</strong>. This would reduce the total
                        portfolio by approximately{" "}
                        <strong>{pct(secDrop.portfolioDeclPct)}</strong>, based on simplified
                        sector mapping.
                      </p>
                    </div>

                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
                      Result
                    </p>
                    <div className="mb-4">
                      <ResultRow label="Selected sector" value={secDrop.sector} />
                      <ResultRow label="Drop assumption" value={pct(sectorDropPct)} />
                      <ResultRow
                        label="Mapped sector exposure"
                        value={`${pct(secDrop.mappedPct)} — ${fmt(secDrop.mappedValue)}`}
                      />
                      <ResultRow
                        label="Estimated dollar impact"
                        value={`−${fmt(secDrop.dollarLoss)}`}
                      />
                      <ResultRow
                        label="Estimated portfolio impact"
                        value={`−${pct(secDrop.portfolioDeclPct)}`}
                      />
                      <ResultRow label="New portfolio value" value={fmt(secDrop.newTotal)} />
                    </div>

                    <WhatThisMeans>
                      This scenario helps you understand sector sensitivity. If a large share of
                      the portfolio is mapped to one sector, a sector decline can affect the
                      overall portfolio more. Sector exposure uses simplified metadata and may not
                      reflect exact current fund holdings.
                    </WhatThisMeans>

                    <EvidencePanel
                      items={[
                        { label: "Selected sector", value: secDrop.sector },
                        { label: "Mapped sector value", value: fmt(secDrop.mappedValue) },
                        { label: "Drop assumption", value: `${pct(sectorDropPct)} hypothetical decline` },
                        { label: "Sector mapping", value: "Static educational metadata" },
                        {
                          label: "Note",
                          value:
                            "Sector exposure may not reflect exact current fund holdings.",
                        },
                      ]}
                    />
                  </>
                )}
              </>
            )}
          </Card>

          {onAskCoach && (
            <button
              onClick={() => onAskCoach("Explain this portfolio scenario in plain English. Focus on what changed, what the result means, and why this is a what-if estimate rather than a prediction.")}
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer mt-1 mb-4"
            >
              <span>✦</span> Explain this scenario
            </button>
          )}

          <Disclaimer extended="Educational only. Not financial advice. These are what-if scenarios based on the holdings entered. No expected returns are applied. Sector mapping uses simplified static metadata." />
        </>
      )}
    </div>
  );
}
