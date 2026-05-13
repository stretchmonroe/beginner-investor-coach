"use client";

import { useState, useEffect, useRef } from "react";
import type { Holding, AssetType, AccountType, Currency, PortfolioInsight, PortfolioContext } from "@/types/portfolio";
import { savePortfolioReport, getPortfolioReports } from "@/lib/portfolioReports";
import CsvImport from "@/components/CsvImport";
import type { ImportMode } from "@/components/CsvImport";
import ScreenshotUpload from "@/components/ScreenshotUpload";
import type { ScreenshotImportMode } from "@/components/ScreenshotUpload";
import TickerAutocomplete from "@/components/TickerAutocomplete";
import type { AutocompleteSuggestion } from "@/components/TickerAutocomplete";
import PortfolioScenarios from "@/components/PortfolioScenarios";
import {
  computeSectorExposure,
  computeGeographyExposure,
  computeCurrencyExposure,
  computeOverlapInsights,
  computeThemeInsights,
  computeUnmappedWeight,
  hasUnmappedHoldings,
  METADATA_DISCLAIMER,
  getMetadata,
  normalizeTicker,
} from "@/lib/portfolioMetadata";
import type { ExposureItem, TickerMetadata, EnrichedMetadataMap } from "@/lib/portfolioMetadata";
import PortfolioCharts from "@/components/PortfolioCharts";
import type { PortfolioReportData } from "@/lib/portfolioReports";
import PageLayout from "@/components/ui/PageLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Disclaimer from "@/components/ui/Disclaimer";
import Dialog from "@/components/ui/Dialog";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { trackEvent } from "@/lib/analytics";
import {
  canUseCsvUpload,
  canUseScreenshotImport,
  canAddMoreHoldings,
  canSaveAnotherReport,
  showAdvancedOverlapInsights,
  UPGRADE_COPY,
  type UpgradeMoment,
} from "@/lib/subscriptionFeatures";

// Session-level FMP metadata cache — persists across re-renders within the browser tab
const fmpCache = new Map<string, TickerMetadata | null>();

// ─── Constants ────────────────────────────────────────────────────────────────

const ASSET_TYPES: AssetType[] = ["Stock", "ETF", "Mutual Fund", "Bond ETF", "Cash", "Other"];
const ACCOUNT_TYPES: AccountType[] = ["TFSA", "RRSP", "FHSA", "Non-registered", "RESP", "Other", "Unknown"];
const CURRENCIES: Currency[] = ["CAD", "USD"];

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmt(value: number): string {
  return "$" + value.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(value: number): string {
  return value.toFixed(1) + "%";
}

// ─── Local concentration analysis (v1, unchanged) ────────────────────────────

interface AssetMixItem {
  assetType: AssetType;
  value: number;
  weight: number;
}

function computeAssetMix(holdings: Holding[], totalValue: number): AssetMixItem[] {
  if (totalValue === 0) return [];
  const byType: Partial<Record<AssetType, number>> = {};
  for (const h of holdings) {
    byType[h.assetType] = (byType[h.assetType] ?? 0) + h.marketValue;
  }
  return (Object.entries(byType) as [AssetType, number][])
    .map(([assetType, value]) => ({ assetType, value, weight: (value / totalValue) * 100 }))
    .sort((a, b) => b.weight - a.weight);
}

function computeConcentrationInsights(holdings: Holding[], totalValue: number): PortfolioInsight[] {
  if (holdings.length === 0 || totalValue === 0) return [];
  const sorted = [...holdings].sort((a, b) => b.marketValue - a.marketValue);
  const insights: PortfolioInsight[] = [];
  const largestWeight = (sorted[0].marketValue / totalValue) * 100;
  const top3Value = sorted.slice(0, 3).reduce((s, h) => s + h.marketValue, 0);
  const top3Weight = (top3Value / totalValue) * 100;
  const hasCash = holdings.some((h) => h.assetType === "Cash");

  if (largestWeight > 25) {
    insights.push({
      id: "high-single-concentration",
      type: "concentration",
      severity: "warning",
      title: "High single-holding concentration",
      description:
        "One holding makes up more than 25% of the portfolio. This may increase portfolio volatility if that holding moves sharply.",
      evidence: [
        { sourceType: "manually-entered", label: "Largest holding", value: sorted[0].ticker || sorted[0].name },
        { sourceType: "manually-entered", label: "Holding weight", value: pct(largestWeight) },
        { sourceType: "manually-entered", label: "Source", value: "Manually entered holding" },
      ],
    });
  }

  if (holdings.length >= 3 && top3Weight > 60) {
    const top3Labels = sorted.slice(0, 3).map((h) => h.ticker || h.name).join(", ");
    insights.push({
      id: "top3-concentration",
      type: "concentration",
      severity: "caution",
      title: "Portfolio is concentrated in a few holdings",
      description:
        "The top three holdings make up more than 60% of the portfolio. This may mean the portfolio depends heavily on a small number of positions.",
      evidence: [
        { sourceType: "manually-entered", label: "Top 3 holdings", value: top3Labels },
        { sourceType: "manually-entered", label: "Combined weight", value: pct(top3Weight) },
        { sourceType: "manually-entered", label: "Source", value: "Manually entered holdings" },
      ],
    });
  }

  if (holdings.length >= 1 && holdings.length <= 3) {
    insights.push({
      id: "few-holdings",
      type: "diversification",
      severity: "info",
      title: "Limited number of holdings",
      description:
        "A small number of holdings can be easier to understand, but may provide less diversification.",
      evidence: [
        { sourceType: "manually-entered", label: "Holdings entered", value: String(holdings.length) },
        { sourceType: "manually-entered", label: "Source", value: "Manually entered holdings" },
      ],
    });
  }

  if (!hasCash) {
    insights.push({
      id: "no-cash",
      type: "cash",
      severity: "info",
      title: "No cash-like holdings entered",
      description:
        "No cash holdings were entered. This is often fine — many investors keep emergency savings and short-term money in a separate account outside their investment portfolio.",
      evidence: [
        { sourceType: "manually-entered", label: "Cash holdings", value: "None entered" },
        { sourceType: "manually-entered", label: "Source", value: "Manually entered holdings" },
      ],
    });
  }

  return insights;
}

// ─── Shared UI helpers ────────────────────────────────────────────────────────

const SEVERITY_BADGE: Record<string, "danger" | "caution" | "info"> = {
  warning: "danger",
  caution: "caution",
  info: "info",
};
const SEVERITY_LABEL: Record<string, string> = {
  warning: "Worth noting",
  caution: "Worth noting",
  info: "For context",
};

function InsightCard({ insight }: { insight: PortfolioInsight }) {
  const dot =
    insight.severity === "warning" ? "bg-rose-400"
    : insight.severity === "caution" ? "bg-amber-400"
    : "bg-slate-300";
  return (
    <div className="flex items-start gap-3 py-5 border-b border-slate-100 last:border-0">
      <span className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${dot}`} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 mb-1">{insight.title}</p>
        <p className="text-sm text-slate-500 leading-relaxed">{insight.description}</p>
        {insight.evidence.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {insight.evidence.map((ev, i) => (
              <p key={i} className="text-xs text-slate-400">
                <span className="font-medium">{ev.label}:</span> {ev.value}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KeyInsightCard({ insight }: { insight: PortfolioInsight }) {
  const dot =
    insight.severity === "warning"
      ? "bg-rose-400"
      : insight.severity === "caution"
      ? "bg-amber-400"
      : "bg-slate-300";
  return (
    <div className="flex gap-4 items-start py-5 first:pt-0 last:pb-0 border-b border-slate-100 last:border-0">
      <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${dot}`} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 mb-1">{insight.title}</p>
        <p className="text-sm text-slate-500 leading-relaxed">{insight.description}</p>
      </div>
    </div>
  );
}

interface HoldingRowProps {
  holding: Holding;
  weight: number;
  isDuplicate: boolean;
  onEdit: (h: Holding) => void;
  onDelete: (id: string) => void;
}

function HoldingRow({ holding: h, weight, isDuplicate, onEdit, onDelete }: HoldingRowProps) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="py-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            {h.ticker && <span className="text-sm font-semibold text-slate-800">{h.ticker}</span>}
            {isDuplicate && <span className="text-xs text-amber-500">Duplicate</span>}
          </div>
          {h.name && <p className="text-xs text-slate-400 truncate mt-0.5">{h.name}</p>}
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-slate-700">{pct(weight)}</p>
          <p className="text-xs text-slate-400">{fmt(h.marketValue)}</p>
        </div>
        <button
          onClick={() => setExpanded((s) => !s)}
          className="text-slate-300 hover:text-slate-500 transition-colors cursor-pointer ml-1 shrink-0 text-[10px] leading-none"
          aria-label={expanded ? "collapse" : "expand"}
        >
          {expanded ? "▲" : "▼"}
        </button>
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="default">{h.assetType}</Badge>
            {h.accountType && h.accountType !== "Unknown" && <Badge variant="muted">{h.accountType}</Badge>}
            <Badge variant="muted">{h.currency}</Badge>
          </div>
          {(h.quantity !== null || h.marketPrice !== null) && (
            <p className="text-xs text-slate-400">
              {h.quantity !== null && <span>{h.quantity} units</span>}
              {h.quantity !== null && h.marketPrice !== null && <span> × </span>}
              {h.marketPrice !== null && <span>{fmt(h.marketPrice)}</span>}
            </p>
          )}
          <div className="flex items-center gap-3">
            <button onClick={() => onEdit(h)} className="text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors cursor-pointer">Edit</button>
            <span className="text-slate-200">·</span>
            <button onClick={() => onDelete(h.id)} className="text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors cursor-pointer">Remove</button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExposureRows({ items }: { items: ExposureItem[] }) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-slate-600">{item.label}</span>
            <span className="text-sm font-semibold text-slate-700 tabular-nums">{pct(item.weight)}</span>
          </div>
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-slate-700"
              style={{ width: `${Math.min(item.weight, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Contextual coach button ──────────────────────────────────────────────────

function CoachBtn({
  label,
  question,
  onAskCoach,
  portfolioContext,
}: {
  label: string;
  question: string;
  onAskCoach?: (question: string, context: PortfolioContext) => void;
  portfolioContext: PortfolioContext | null;
}) {
  if (!onAskCoach || !portfolioContext) return null;
  return (
    <button
      onClick={() => onAskCoach(question, portfolioContext)}
      className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
    >
      <span>🪔</span> {label}
    </button>
  );
}

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  ticker: string;
  name: string;
  assetType: AssetType;
  accountType: AccountType;
  currency: Currency;
  quantity: string;
  marketPrice: string;
  marketValue: string;
}

const DEFAULT_FORM: FormState = {
  ticker: "",
  name: "",
  assetType: "Stock",
  accountType: "Unknown",
  currency: "CAD",
  quantity: "",
  marketPrice: "",
  marketValue: "",
};

// text-base on mobile prevents iOS Safari from auto-zooming on input focus
const inputClass =
  "w-full text-base md:text-sm border border-slate-200 rounded-xl px-3 py-2.5 md:py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white";
const labelClass = "block text-xs font-medium text-slate-500 mb-1";

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
  monthlyContribution?: number;
  sessionId: string;
  userId?: string;
  initialHoldings?: Holding[];
  isSample?: boolean;
  onClearSample?: () => void;
  onAskCoach?: (question: string, context: PortfolioContext) => void;
  onViewReport?: (data: PortfolioReportData) => void;
  onViewPremiumTools?: () => void;
  onSamplePortfolio?: () => void;
  onSignIn?: () => void;
}

export default function PortfolioXRay({ onBack, monthlyContribution, sessionId, userId, initialHoldings, isSample, onClearSample, onAskCoach, onViewReport, onViewPremiumTools, onSamplePortfolio, onSignIn }: Props) {
  const { tier, isPremium, openCheckout } = useSubscription();
  const [upgradeMoment, setUpgradeMoment] = useState<UpgradeMoment | null>(null);
  const [holdings, setHoldings] = useState<Holding[]>(initialHoldings ?? []);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [reportName, setReportName] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [showScreenshotUpload, setShowScreenshotUpload] = useState(false);
  const [enrichedMetadata, setEnrichedMetadata] = useState<EnrichedMetadataMap>({});
  const [enrichmentStatus, setEnrichmentStatus] = useState<"idle" | "loading" | "done">("idle");
  const enrichingRef = useRef(false);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [showAllHoldings, setShowAllHoldings] = useState(false);
  const [showFullExposure, setShowFullExposure] = useState(false);

  // ── FMP enrichment for unknown tickers ───────────────────────────────────

  useEffect(() => {
    if (holdings.length === 0) return;

    const uncached = [
      ...new Set(
        holdings
          .map((h) => normalizeTicker(h.ticker))
          .filter((t) => t && !getMetadata(t) && !fmpCache.has(t))
      ),
    ];

    if (uncached.length === 0) {
      setEnrichmentStatus("done");
      return;
    }

    if (enrichingRef.current) return;
    enrichingRef.current = true;
    setEnrichmentStatus("loading");

    const fetchOne = async (ticker: string) => {
      try {
        const res = await fetch(`/api/holding-metadata?ticker=${encodeURIComponent(ticker)}`);
        if (!res.ok) { fmpCache.set(ticker, null); return; }
        const data = await res.json() as { metadata: TickerMetadata | null };
        fmpCache.set(ticker, data.metadata ?? null);
      } catch {
        fmpCache.set(ticker, null);
      }
    };

    Promise.all(uncached.map(fetchOne)).then(() => {
      const updates: EnrichedMetadataMap = {};
      for (const t of uncached) updates[t] = fmpCache.get(t) ?? null;
      setEnrichedMetadata((prev) => ({ ...prev, ...updates }));
      setEnrichmentStatus("done");
      enrichingRef.current = false;
    });
  }, [holdings]);

  // ── Analytics: fire once when first analysis is ready ────────────────────

  const hasFiredXrayRef = useRef(false);
  useEffect(() => {
    if (hasFiredXrayRef.current || holdings.length === 0 || enrichmentStatus !== "done") return;
    hasFiredXrayRef.current = true;

    const unknownCount = holdings.filter((h) => {
      const t = normalizeTicker(h.ticker);
      return !(getMetadata(t) ?? enrichedMetadata[t]);
    }).length;

    if (isSample) {
      trackEvent("sample_portfolio_loaded");
    }
    trackEvent("portfolio_xray_generated", {
      holdings_count: holdings.length,
      is_sample: isSample ?? false,
    });
    if (unknownCount > 0) {
      trackEvent("unknown_holdings_detected", { unknown_count: unknownCount });
    }
  }, [holdings, enrichmentStatus, enrichedMetadata, isSample]);

  // ── Derived ──────────────────────────────────────────────────────────────

  const totalValue = holdings.reduce((s, h) => s + h.marketValue, 0);
  const sortedByValue = [...holdings].sort((a, b) => b.marketValue - a.marketValue);
  const assetMix = computeAssetMix(holdings, totalValue);
  const concentrationInsights = computeConcentrationInsights(holdings, totalValue);

  const sectorExposure = computeSectorExposure(holdings, totalValue, enrichedMetadata);
  const geographyExposure = computeGeographyExposure(holdings, totalValue, enrichedMetadata);
  const currencyExposure = computeCurrencyExposure(holdings, totalValue, enrichedMetadata);
  const unmappedWeightPct = computeUnmappedWeight(holdings, totalValue, enrichedMetadata);
  const overlapInsights = computeOverlapInsights(holdings);
  const themeInsights = computeThemeInsights(sectorExposure, geographyExposure, unmappedWeightPct);
  const hasUnmapped = hasUnmappedHoldings(holdings, enrichedMetadata);

  const mappedCount = holdings.filter((h) => {
    const t = normalizeTicker(h.ticker);
    return !!(getMetadata(t) ?? enrichedMetadata[t]);
  }).length;
  const unknownHoldings = holdings.filter((h) => {
    const t = normalizeTicker(h.ticker);
    return !(getMetadata(t) ?? enrichedMetadata[t]);
  });

  // Duplicate ticker detection
  const tickerCounts = holdings.reduce<Record<string, number>>((acc, h) => {
    const t = normalizeTicker(h.ticker);
    if (t) acc[t] = (acc[t] ?? 0) + 1;
    return acc;
  }, {});
  const duplicateTickerSet = new Set(
    Object.entries(tickerCounts).filter(([, c]) => c > 1).map(([t]) => t)
  );

  // Mixed currency detection
  const hasMixedCurrencies =
    holdings.some((h) => h.currency === "CAD") &&
    holdings.some((h) => h.currency === "USD");

  const top3Weight =
    totalValue > 0
      ? (sortedByValue.slice(0, 3).reduce((s, h) => s + h.marketValue, 0) / totalValue) * 100
      : 0;

  const portfolioContext: PortfolioContext | null = holdings.length > 0 ? {
    totalValue,
    currency: "CAD",
    holdings: sortedByValue.map((h) => ({
      ticker: h.ticker,
      name: h.name,
      assetType: h.assetType,
      marketValue: h.marketValue,
      weight: totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0,
    })),
    largestHolding: sortedByValue.length > 0
      ? { label: sortedByValue[0].ticker || sortedByValue[0].name, weight: (sortedByValue[0].marketValue / totalValue) * 100 }
      : undefined,
    top3Weight: holdings.length >= 3 ? top3Weight : undefined,
    assetMix: assetMix.map((m) => ({ assetType: m.assetType, weight: m.weight })),
    sectorExposure,
    geographyExposure,
    currencyExposure,
    concentrationInsights: concentrationInsights.map((i) => ({ title: i.title, description: i.description })),
    overlapInsights: overlapInsights.map((i) => ({ title: i.title, description: i.description })),
    themeInsights: themeInsights.map((i) => ({ title: i.title, description: i.description })),
    unknownHoldingCount: unknownHoldings.length,
    unknownHoldingTickers: unknownHoldings.map((h) => h.ticker || h.name).filter(Boolean),
    hasMixedCurrencies,
  } : null;

  const qtyNum = form.quantity !== "" ? parseFloat(form.quantity) : NaN;
  const priceNum = form.marketPrice !== "" ? parseFloat(form.marketPrice) : NaN;
  const computedMV = !isNaN(qtyNum) && !isNaN(priceNum) ? qtyNum * priceNum : null;

  // ── Form helpers ─────────────────────────────────────────────────────────

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function openAddForm() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(h: Holding) {
    setEditingId(h.id);
    setForm({
      ticker: h.ticker,
      name: h.name,
      assetType: h.assetType,
      accountType: h.accountType,
      currency: h.currency,
      quantity: h.quantity !== null ? String(h.quantity) : "",
      marketPrice: h.marketPrice !== null ? String(h.marketPrice) : "",
      marketValue: String(h.marketValue),
    });
    setFormError(null);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(DEFAULT_FORM);
    setFormError(null);
  }

  function openPremiumNotice(moment: UpgradeMoment) {
    setUpgradeMoment(moment);
    trackEvent("upgrade_prompt_viewed", { feature: moment });
  }

  function tryOpenCsv() {
    if (!canUseCsvUpload(tier)) {
      openPremiumNotice("csv");
      return;
    }
    trackEvent("csv_upload_started", { source: "portfolio_xray" });
    setShowCsvImport(true);
  }

  function tryOpenScreenshot() {
    if (!canUseScreenshotImport(tier)) {
      openPremiumNotice("screenshot");
      return;
    }
    trackEvent("screenshot_upload_started", { source: "portfolio_xray" });
    setShowScreenshotUpload(true);
  }

  function submitForm() {
    if (!form.ticker.trim() && !form.name.trim()) {
      setFormError("Enter a ticker symbol or holding name.");
      return;
    }
    const resolvedMV = computedMV ?? parseFloat(form.marketValue);
    if (!resolvedMV || resolvedMV <= 0) {
      setFormError(
        "Enter a market value, or fill in both quantity and market price to calculate it automatically."
      );
      return;
    }

    if (!editingId && !canAddMoreHoldings(tier, holdings.length)) {
      openPremiumNotice("holdings");
      return;
    }

    const holding: Holding = {
      id: editingId ?? crypto.randomUUID(),
      ticker: form.ticker.trim().toUpperCase(),
      name: form.name.trim(),
      assetType: form.assetType,
      accountType: form.accountType,
      currency: form.currency,
      quantity: !isNaN(qtyNum) ? qtyNum : null,
      marketPrice: !isNaN(priceNum) ? priceNum : null,
      marketValue: resolvedMV,
      source: "manual",
      createdAt:
        editingId
          ? (holdings.find((h) => h.id === editingId)?.createdAt ?? new Date().toISOString())
          : new Date().toISOString(),
    };

    if (!editingId) {
      trackEvent("holdings_added_manual", { holdings_count: holdings.length + 1 });
    }
    setHoldings((prev) =>
      editingId ? prev.map((h) => (h.id === editingId ? holding : h)) : [...prev, holding]
    );
    cancelForm();
  }

  function deleteHolding(id: string) {
    setHoldings((prev) => prev.filter((h) => h.id !== id));
  }

  async function handleSave() {
    if (!sessionId || holdings.length === 0) return;
    if (!isPremium) {
      try {
        const rows = await getPortfolioReports(sessionId, userId);
        if (!canSaveAnotherReport(tier, rows.length)) {
          openPremiumNotice("savedReports");
          return;
        }
      } catch {
        setSaveState("error");
        return;
      }
    }
    setSaveState("saving");
    try {
      await savePortfolioReport({
        anonymous_session_id: sessionId,
        report_name: reportName.trim() || null,
        total_value: totalValue,
        currency: "CAD",
        holdings_json: holdings,
        concentration_json: {
          concentrationInsights,
          assetMix: assetMix.map((m) => ({ assetType: m.assetType, value: m.value, weight: m.weight })),
          notes: reportNotes.trim() || undefined,
          unknownHoldingCount: unknownHoldings.length,
          mappedHoldingCount: mappedCount,
          hasMixedCurrencies,
        },
        exposure_json: { sectorExposure, geographyExposure, currencyExposure },
        overlap_insights_json: { overlapInsights, themeInsights },
      }, userId);
      setSaveState("saved");
      setReportNotes("");
      trackEvent("report_saved", { has_notes: reportNotes.trim().length > 0 });
    } catch {
      setSaveState("error");
    }
  }

  function handleCsvImport(imported: Holding[], mode: ImportMode) {
    setHoldings((prev) => mode === "replace" ? imported : [...prev, ...imported]);
    trackEvent("csv_upload_completed", { holdings_count: imported.length });
  }

  function handleScreenshotImport(imported: Holding[], mode: ScreenshotImportMode) {
    setHoldings((prev) => mode === "replace" ? imported : [...prev, ...imported]);
    setShowScreenshotUpload(false);
    trackEvent("screenshot_upload_completed", { holdings_count: imported.length });
  }

  function handleTickerSelect(suggestion: AutocompleteSuggestion) {
    const formCurrency: Currency = suggestion.currency === "USD" ? "USD" : "CAD";
    setForm((prev) => ({
      ...prev,
      ticker: suggestion.ticker,
      name: suggestion.name,
      assetType: suggestion.assetType !== null ? suggestion.assetType : prev.assetType,
      currency: formCurrency,
    }));
  }

  function handleViewReport() {
    if (!onViewReport || holdings.length === 0) return;
    onViewReport({
      reportName: reportName.trim() || null,
      reportDate: new Date().toISOString(),
      totalValue,
      holdings,
      assetMix: assetMix.map((m) => ({ assetType: m.assetType, value: m.value, weight: m.weight })),
      concentrationInsights,
      sectorExposure,
      geographyExposure,
      currencyExposure,
      overlapInsights,
      themeInsights,
    });
  }

  const showAdvancedOverlap = showAdvancedOverlapInsights(tier);
  const overlapToDisplay = showAdvancedOverlap ? overlapInsights : overlapInsights.slice(0, 1);
  const themeToDisplay = showAdvancedOverlap ? themeInsights : [];

  const topSector = sectorExposure[0] ?? null;
  const sortOrder = { warning: 0, caution: 1, info: 2 } as const;
  const keyInsights = [...concentrationInsights, ...overlapToDisplay, ...themeToDisplay]
    .sort((a, b) => (sortOrder[a.severity as keyof typeof sortOrder] ?? 2) - (sortOrder[b.severity as keyof typeof sortOrder] ?? 2))
    .slice(0, 3);

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <PageLayout maxWidth="xl">
      <PageHeader
        title="Portfolio X-Ray"
        action={
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
        }
      />

      {/* ── Sample portfolio banner ── */}
      {isSample && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 text-sm">
          <span className="text-amber-500 text-base shrink-0 mt-0.5">🧪</span>
          <div className="flex-1">
            <p className="font-semibold text-amber-800">You&apos;re viewing a sample portfolio</p>
            <p className="text-amber-700 text-xs mt-0.5">This is a fictional beginner portfolio designed to show overlaps and exposures. Your holdings are not saved.</p>
          </div>
          <button
            onClick={onClearSample}
            className="text-xs text-amber-700 underline hover:text-amber-900 transition-colors cursor-pointer shrink-0 mt-0.5"
          >
            Start with my own
          </button>
        </div>
      )}

      {/* ── Add / Edit form ── */}
      {showForm && (
        <Card className="mb-6">
          <p className="text-sm font-semibold text-slate-800 mb-4">
            {editingId ? "Edit holding" : "Add holding"}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4 mb-4">
            <div>
              <label className={labelClass}>Ticker</label>
              <TickerAutocomplete
                value={form.ticker}
                onChange={(v) => setField("ticker", v)}
                onSelect={handleTickerSelect}
                placeholder="e.g. VFV"
                inputClassName={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Holding name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="e.g. Vanguard S&P 500 ETF"
                className={inputClass}
              />
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-400">Search local examples by ticker or name. You can still add holdings that are not listed.</p>
            </div>
            <div>
              <label className={labelClass}>Asset type</label>
              <select
                value={form.assetType}
                onChange={(e) => setField("assetType", e.target.value as AssetType)}
                className={inputClass}
              >
                {ASSET_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Account type</label>
              <select
                value={form.accountType}
                onChange={(e) => setField("accountType", e.target.value as AccountType)}
                className={inputClass}
              >
                {ACCOUNT_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>
                Quantity <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.quantity}
                onChange={(e) => setField("quantity", e.target.value)}
                placeholder="e.g. 10"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Market price <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="number"
                min="0"
                value={form.marketPrice}
                onChange={(e) => setField("marketPrice", e.target.value)}
                placeholder="e.g. 125.50"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>
                Market value
                {computedMV !== null && (
                  <span className="ml-1 font-normal text-teal-600">— calculated</span>
                )}
              </label>
              <input
                type="number"
                min="0"
                value={computedMV !== null ? computedMV.toFixed(2) : form.marketValue}
                onChange={(e) => { if (computedMV === null) setField("marketValue", e.target.value); }}
                readOnly={computedMV !== null}
                placeholder="e.g. 1255.00"
                className={
                  computedMV !== null
                    ? "w-full text-sm border border-slate-100 rounded-xl px-3 py-2 bg-slate-50 text-slate-500"
                    : inputClass
                }
              />
            </div>
            <div>
              <label className={labelClass}>Currency</label>
              <select
                value={form.currency}
                onChange={(e) => setField("currency", e.target.value as Currency)}
                className={inputClass}
              >
                {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {formError && <p className="text-xs text-rose-500 mb-3">{formError}</p>}

          <div className="flex items-center gap-3">
            <Button onClick={submitForm}>{editingId ? "Save holding" : "Add holding"}</Button>
            <Button variant="ghost" onClick={cancelForm}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* ── CSV import panel ── */}
      {showCsvImport && (
        <div className="mb-6">
          <CsvImport
            existingHoldings={holdings}
            onImport={handleCsvImport}
            onCancel={() => setShowCsvImport(false)}
          />
        </div>
      )}

      {/* ── Screenshot upload panel ── */}
      {showScreenshotUpload && (
        <div className="mb-6">
          <ScreenshotUpload
            existingHoldings={holdings}
            onImport={handleScreenshotImport}
            onCancel={() => setShowScreenshotUpload(false)}
          />
        </div>
      )}

      {/* ── Empty state ── */}
      {holdings.length === 0 && !showForm && !showCsvImport && !showScreenshotUpload && (
        <div className="flex flex-col items-center text-center py-14">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center mb-5">
            <span className="text-2xl">🪔</span>
          </div>
          <h2 className="text-lg font-semibold text-slate-800 mb-2">Start exploring your portfolio</h2>
          <p className="text-sm text-slate-500 mb-8 max-w-sm leading-relaxed">
            Enter your holdings to see what you own, where it&apos;s concentrated, and what overlaps. Not sure where to start? Try the sample portfolio.
          </p>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={openAddForm} fullWidth>+ Add manually</Button>
              <Button variant="secondary" onClick={tryOpenCsv} fullWidth>Upload CSV</Button>
            </div>
            <Button variant="secondary" onClick={tryOpenScreenshot} fullWidth>
              Upload screenshot
            </Button>
            {onSamplePortfolio && (
              <button
                onClick={onSamplePortfolio}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer mt-1"
              >
                Try a sample portfolio →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Main analysis ── */}
      {holdings.length > 0 && (
        <div className="space-y-14">

          {/* 1. What stands out */}
          {keyInsights.length > 0 && (
            <section>
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="text-xl font-bold tracking-tight text-slate-900">What stands out</h2>
                {onAskCoach && portfolioContext && (
                  <button
                    onClick={() => onAskCoach(
                      "Explain the key insights from my Portfolio X-Ray in plain English for a beginner investor.",
                      portfolioContext
                    )}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <span>🪔</span> Ask Lantern
                  </button>
                )}
              </div>
              <div>
                {keyInsights.map((insight) => (
                  <KeyInsightCard key={insight.id} insight={insight} />
                ))}
              </div>
            </section>
          )}

          {/* 2. Portfolio snapshot */}
          <section>
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 mb-5">Portfolio snapshot</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-5">
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Total value</p>
                <p className="text-xl font-bold text-slate-800">{fmt(totalValue)}</p>
                {hasMixedCurrencies && <p className="text-xs text-slate-400 mt-0.5">CAD + USD</p>}
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Holdings</p>
                <p className="text-xl font-bold text-slate-800">{holdings.length}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Largest holding</p>
                <p className="text-sm font-bold text-slate-800 truncate">
                  {sortedByValue[0].ticker || sortedByValue[0].name}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {pct((sortedByValue[0].marketValue / totalValue) * 100)} of portfolio
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400 mb-0.5">Top sector</p>
                {topSector ? (
                  <>
                    <p className="text-sm font-bold text-slate-800 truncate">{topSector.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{pct(topSector.weight)} est.</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400">—</p>
                )}
              </div>
            </div>
          </section>

          {/* 3. Exposure */}
          {(assetMix.length > 0 || sectorExposure.length > 0) && (
            <section>
              <div className="flex items-baseline justify-between mb-6">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Exposure</h2>
                {enrichmentStatus === "loading" && (
                  <span className="text-xs text-slate-400">Looking up holdings…</span>
                )}
              </div>
              <div className="space-y-6">
                {assetMix.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-3">Asset mix</p>
                    <ExposureRows items={assetMix.map((i) => ({ label: i.assetType, value: i.value, weight: i.weight }))} />
                  </div>
                )}
                {sectorExposure.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-slate-400 mb-3">Sector</p>
                    <ExposureRows items={sectorExposure} />
                  </div>
                )}
                {(geographyExposure.length > 0 || currencyExposure.length > 0) && (
                  <div className="pt-2">
                    <button
                      onClick={() => setShowFullExposure((s) => !s)}
                      className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showFullExposure ? "Show less ▲" : "Geography & currency ▼"}
                    </button>
                    {showFullExposure && (
                      <div className="mt-5 space-y-6">
                        {geographyExposure.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-slate-400 mb-3">Geography</p>
                            <ExposureRows items={geographyExposure} />
                          </div>
                        )}
                        {currencyExposure.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-slate-400 mb-3">Currency</p>
                            <ExposureRows items={currencyExposure} />
                            <p className="text-xs text-slate-400 mt-3">A Canadian-listed ETF may still hold foreign assets.</p>
                          </div>
                        )}
                        {enrichmentStatus === "done" && hasUnmapped && (
                          <p className="text-xs text-amber-600">
                            {unknownHoldings.length} holding{unknownHoldings.length === 1 ? "" : "s"} not fully mapped
                            {" "}({unknownHoldings.map((h) => h.ticker || h.name).filter(Boolean).join(", ")}).
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-400 pt-2">{METADATA_DISCLAIMER}</p>
              </div>
              {onAskCoach && portfolioContext && (
                <div className="mt-3">
                  <button
                    onClick={() => onAskCoach(
                      "Explain my sector, geography, and asset type exposure in plain English. Mention these are simplified estimates.",
                      portfolioContext
                    )}
                    className="flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors cursor-pointer"
                  >
                    <span>🪔</span> Ask Lantern about exposure
                  </button>
                </div>
              )}
            </section>
          )}

          {/* 4. Holdings */}
          {!showForm && !showCsvImport && !showScreenshotUpload && (
            <section>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Holdings</h2>
                <div className="flex items-center gap-1.5">
                  <Button variant="secondary" size="sm" onClick={openAddForm}>+ Add</Button>
                  <Button variant="ghost" size="sm" onClick={tryOpenCsv}>CSV</Button>
                  <Button variant="ghost" size="sm" onClick={tryOpenScreenshot}>Screenshot</Button>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {(showAllHoldings ? sortedByValue : sortedByValue.slice(0, 4)).map((h) => (
                  <HoldingRow
                    key={h.id}
                    holding={h}
                    weight={totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0}
                    isDuplicate={duplicateTickerSet.has(normalizeTicker(h.ticker))}
                    onEdit={openEditForm}
                    onDelete={deleteHolding}
                  />
                ))}
              </div>
              {sortedByValue.length > 4 && (
                <button
                  onClick={() => setShowAllHoldings((s) => !s)}
                  className="mt-3 text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showAllHoldings ? "Show less ▲" : `View all ${sortedByValue.length} holdings ▼`}
                </button>
              )}
            </section>
          )}

          {/* 5. Detailed analysis (collapsed) */}
          <section>
            <button
              onClick={() => setShowDetailedAnalysis((s) => !s)}
              className="flex items-center gap-2 text-base font-semibold tracking-tight text-slate-500 hover:text-slate-800 transition-colors cursor-pointer mb-6"
            >
              View detailed analysis <span className="text-sm text-slate-400">{showDetailedAnalysis ? "▲" : "▼"}</span>
            </button>
            {showDetailedAnalysis && (
              <div className="space-y-6">
                <PortfolioCharts
                  holdings={holdings}
                  totalValue={totalValue}
                  assetTypeItems={assetMix.map((m) => ({ label: m.assetType, value: m.value, weight: m.weight }))}
                  sectorExposure={sectorExposure}
                  geographyExposure={geographyExposure}
                  currencyExposure={currencyExposure}
                  hasUnmapped={hasUnmapped}
                />
                {concentrationInsights.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">Concentration details</h3>
                    <div className="space-y-4">
                      {concentrationInsights.map((insight) => (
                        <InsightCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </div>
                )}
                {overlapToDisplay.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">Overlap details</h3>
                    <div className="space-y-4">
                      {overlapToDisplay.map((insight) => (
                        <InsightCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </div>
                )}
                {themeToDisplay.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-600 mb-3">Theme insights</h3>
                    <div className="space-y-4">
                      {themeToDisplay.map((insight) => (
                        <InsightCard key={insight.id} insight={insight} />
                      ))}
                    </div>
                  </div>
                )}
                {!showAdvancedOverlap && (overlapInsights.length > 1 || themeInsights.length > 0) && (
                  <div className="py-3">
                    <p className="text-sm text-slate-500 mb-1.5">
                      Additional overlap and theme insights available with Premium Portfolio Tools.
                    </p>
                    {onViewPremiumTools && (
                      <button
                        onClick={onViewPremiumTools}
                        className="text-xs font-medium text-slate-500 hover:text-slate-700 underline underline-offset-2 transition-colors cursor-pointer"
                      >
                        Learn about Premium →
                      </button>
                    )}
                  </div>
                )}
                <p className="text-xs text-slate-400">
                  {mappedCount} of {holdings.length} holdings mapped
                  {Object.values(enrichedMetadata).some((v) => v !== null) && " · includes FMP data"}
                </p>
              </div>
            )}
          </section>

          {/* 6. Portfolio actions */}
          <section>
            <div className="sm:grid sm:grid-cols-[3fr_2fr] sm:gap-x-14 sm:items-start">

              {/* Save snapshot */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900">Save snapshot</h2>
                  {onViewReport && (
                    <Button variant="secondary" size="sm" onClick={handleViewReport}>
                      View Report
                    </Button>
                  )}
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className={labelClass}>
                      Snapshot name <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={reportName}
                      onChange={(e) => { setReportName(e.target.value); setSaveState("idle"); }}
                      placeholder={`Portfolio X-Ray — ${new Date().toLocaleDateString("en-CA", { month: "long", year: "numeric" })}`}
                      className={inputClass}
                      maxLength={80}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>
                      Notes <span className="font-normal text-slate-400">(optional)</span>
                    </label>
                    <textarea
                      value={reportNotes}
                      onChange={(e) => { setReportNotes(e.target.value.slice(0, 300)); setSaveState("idle"); }}
                      placeholder="e.g. After adding new ETF position…"
                      rows={2}
                      className="w-full text-base md:text-sm border border-slate-200 rounded-xl px-3 py-2.5 md:py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white resize-none"
                    />
                    <p className="text-xs text-slate-400 mt-0.5">{reportNotes.length}/300</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={handleSave} disabled={saveState === "saving"}>
                      {saveState === "saving" ? "Saving…" : "Save snapshot"}
                    </Button>
                    {saveState === "saved" && (
                      <p className="text-xs text-teal-600 font-medium">Saved. View it in Saved Reports on the dashboard.</p>
                    )}
                    {saveState === "error" && (
                      <p className="text-xs text-rose-500 font-medium">Could not save. Please try again.</p>
                    )}
                  </div>
                  {!userId && onSignIn && (
                    <p className="text-xs text-slate-400 mt-1">
                      <button
                        onClick={onSignIn}
                        className="underline underline-offset-2 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        Sign in
                      </button>{" "}
                      to save across devices.
                    </p>
                  )}
                </div>
              </div>

              {/* Ask Lantern */}
              {onAskCoach && portfolioContext && (
                <div className="mt-10 sm:mt-0">
                  <h2 className="text-lg font-semibold tracking-tight text-slate-900 mb-3">Ask Lantern</h2>
                  <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                    Get a plain-English walkthrough — what stands out, what overlaps, what to think about.
                  </p>
                  <Button
                    onClick={() => onAskCoach(
                      "Explain my Portfolio X-Ray in plain English. Focus on concentration, exposure, overlap, and what may be worth understanding for a beginner investor.",
                      portfolioContext
                    )}
                  >
                    Explain my portfolio
                  </Button>
                </div>
              )}

            </div>
          </section>

          {/* 8. Explore scenarios */}
          <PortfolioScenarios
            holdings={holdings}
            totalValue={totalValue}
            sectorExposure={sectorExposure}
            defaultMonthlyContribution={monthlyContribution}
            onAskCoach={onAskCoach && portfolioContext ? (q) => onAskCoach(q, portfolioContext) : undefined}
          />

        </div>
      )}

      <Disclaimer extended="Educational only. Not financial advice. This analysis is based on the holdings you enter and simplified exposure mappings. It may not reflect current fund holdings, fees, market prices, currency conversion, taxes, or your full financial situation." />

      <Dialog
        open={upgradeMoment !== null}
        onClose={() => setUpgradeMoment(null)}
        title={upgradeMoment ? UPGRADE_COPY[upgradeMoment].title : ""}
        description={upgradeMoment ? UPGRADE_COPY[upgradeMoment].body : undefined}
        primaryLabel={upgradeMoment ? UPGRADE_COPY[upgradeMoment].primaryCta : "OK"}
        onPrimary={() => {
          trackEvent("upgrade_prompt_clicked", { feature: upgradeMoment ?? undefined });
          setUpgradeMoment(null);
          openCheckout();
        }}
        secondaryLabel="Not now"
        onSecondary={() => {}}
      />
    </PageLayout>
  );
}
