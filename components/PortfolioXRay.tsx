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
        "No cash holdings were entered. This may be fine, but beginners may want to separately think about emergency savings and short-term money outside their investment portfolio.",
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
  return (
    <Card>
      <div className="mb-2">
        <Badge variant={SEVERITY_BADGE[insight.severity]}>
          {SEVERITY_LABEL[insight.severity]}
        </Badge>
      </div>
      <p className="text-sm font-semibold text-slate-800 mb-1">{insight.title}</p>
      <p className="text-sm text-slate-600 leading-relaxed mb-4">{insight.description}</p>
      <div className="border-t border-slate-100 pt-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Evidence</p>
        <div className="space-y-1.5">
          {insight.evidence.map((ev, i) => (
            <div key={i} className="flex items-baseline gap-2 text-xs">
              <span className="font-semibold text-slate-500 shrink-0">{ev.label}:</span>
              <span className="text-slate-600">{ev.value}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function ExposureRows({ items }: { items: ExposureItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <span className="text-sm text-slate-700 w-32 shrink-0">{item.label}</span>
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-400"
              style={{ width: `${Math.min(item.weight, 100)}%` }}
            />
          </div>
          <span className="text-sm font-semibold text-slate-600 w-10 text-right shrink-0">
            {pct(item.weight)}
          </span>
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
      <span>✦</span> {label}
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

const inputClass =
  "w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white";
const labelClass = "block text-xs font-medium text-slate-500 mb-1";

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
  monthlyContribution?: number;
  sessionId: string;
  initialHoldings?: Holding[];
  isSample?: boolean;
  onClearSample?: () => void;
  onAskCoach?: (question: string, context: PortfolioContext) => void;
  onViewReport?: (data: PortfolioReportData) => void;
  onViewPremiumTools?: () => void;
}

export default function PortfolioXRay({ onBack, monthlyContribution, sessionId, initialHoldings, isSample, onClearSample, onAskCoach, onViewReport, onViewPremiumTools }: Props) {
  const { tier, isPremium } = useSubscription();
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
  }

  function tryOpenCsv() {
    if (!canUseCsvUpload(tier)) {
      openPremiumNotice("csv");
      return;
    }
    setShowCsvImport(true);
  }

  function tryOpenScreenshot() {
    if (!canUseScreenshotImport(tier)) {
      openPremiumNotice("screenshot");
      return;
    }
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
        const rows = await getPortfolioReports(sessionId);
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
      });
      setSaveState("saved");
      setReportNotes("");
    } catch {
      setSaveState("error");
    }
  }

  function handleCsvImport(imported: Holding[], mode: ImportMode) {
    setHoldings((prev) => mode === "replace" ? imported : [...prev, ...imported]);
  }

  function handleScreenshotImport(imported: Holding[], mode: ScreenshotImportMode) {
    setHoldings((prev) => mode === "replace" ? imported : [...prev, ...imported]);
    setShowScreenshotUpload(false);
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

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <PageLayout maxWidth="lg">
      <PageHeader
        title="Portfolio X-Ray"
        description="Enter your holdings to see concentration, exposure, and beginner-friendly insights."
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
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 mb-4">
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
        <Card className="mb-6">
          <p className="text-sm font-semibold text-slate-800 mb-1">Add holdings to unlock your Portfolio X-Ray.</p>
          <p className="text-sm text-slate-500 mb-4 leading-relaxed">
            Add holdings manually to explore concentration and exposure on the free tier.{" "}
            <span className="text-slate-600">CSV import and screenshot extraction</span> are part of{" "}
            <span className="font-medium text-slate-700">Premium Portfolio Tools</span> when you are ready.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={openAddForm}>+ Add manually</Button>
            <Button variant="secondary" onClick={tryOpenCsv}>Upload CSV</Button>
            <Button
              variant="secondary"
              onClick={tryOpenScreenshot}
              className="col-span-2"
            >
              Upload screenshot
            </Button>
          </div>
        </Card>
      )}

      {/* ── A. Holdings list ── */}
      {holdings.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-800">Holdings</h2>
            {!showForm && !showCsvImport && !showScreenshotUpload && (
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={openAddForm}>+ Add holding</Button>
                <Button variant="ghost" size="sm" onClick={tryOpenCsv}>Upload CSV</Button>
                <Button variant="ghost" size="sm" onClick={tryOpenScreenshot}>Screenshot</Button>
              </div>
            )}
          </div>
          <div className="space-y-3">
            {holdings.map((h) => {
              const weight = totalValue > 0 ? (h.marketValue / totalValue) * 100 : 0;
              return (
                <Card key={h.id} padding="sm">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        {h.ticker && <span className="text-sm font-bold text-slate-800">{h.ticker}</span>}
                        {h.name && <span className="text-sm text-slate-500">{h.name}</span>}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="default">{h.assetType}</Badge>
                        <Badge variant="muted">{h.accountType}</Badge>
                        <Badge variant="muted">{h.currency}</Badge>
                      </div>
                      {h.ticker && duplicateTickerSet.has(normalizeTicker(h.ticker)) && (
                        <p className="text-xs text-amber-600 mt-1.5">Duplicate ticker — this appears more than once.</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-slate-800">{fmt(h.marketValue)}</p>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">{pct(weight)}</p>
                    </div>
                  </div>
                  {(h.quantity !== null || h.marketPrice !== null) && (
                    <p className="text-xs text-slate-400 mb-2">
                      {h.quantity !== null && <span>{h.quantity} units</span>}
                      {h.quantity !== null && h.marketPrice !== null && <span> × </span>}
                      {h.marketPrice !== null && <span>{fmt(h.marketPrice)}</span>}
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditForm(h)}
                      className="text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                    >Edit</button>
                    <span className="text-slate-200">·</span>
                    <button
                      onClick={() => deleteHolding(h.id)}
                      className="text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >Delete</button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Mixed currency note ── */}
      {hasMixedCurrencies && holdings.length > 0 && (
        <div className="mb-4 rounded-xl bg-blue-50 border border-blue-200 px-4 py-3">
          <p className="text-xs font-semibold text-blue-700 mb-1">Mixed currencies detected</p>
          <p className="text-xs text-blue-600 leading-relaxed">
            Your holdings include both CAD and USD values. Total portfolio value is shown as a simple sum without currency conversion, so the combined total may not reflect a single-currency equivalent.
          </p>
        </div>
      )}

      {/* ── Summary ── */}
      {holdings.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-3">Summary</h2>
          <div className="grid grid-cols-2 gap-3">
            <Card variant="muted" padding="sm">
              <p className="text-xs text-slate-400 mb-0.5">Total value</p>
              <p className="text-lg font-bold text-slate-800">{fmt(totalValue)}</p>
            </Card>
            <Card variant="muted" padding="sm">
              <p className="text-xs text-slate-400 mb-0.5">Holdings</p>
              <p className="text-lg font-bold text-slate-800">{holdings.length}</p>
            </Card>
            <Card variant="muted" padding="sm" className="col-span-2">
              <p className="text-xs text-slate-400 mb-0.5">Largest holding</p>
              <p className="text-sm font-bold text-slate-800">
                {sortedByValue[0].ticker || sortedByValue[0].name}{" "}
                <span className="text-slate-500 font-semibold">
                  — {pct((sortedByValue[0].marketValue / totalValue) * 100)} of portfolio
                </span>
              </p>
            </Card>
            {holdings.length >= 3 && (
              <Card variant="muted" padding="sm" className="col-span-2">
                <p className="text-xs text-slate-400 mb-0.5">Top 3 holdings combined</p>
                <p className="text-sm font-bold text-slate-800">{pct(top3Weight)} of portfolio</p>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* ── Primary actions row ── */}
      {holdings.length > 0 && !showForm && !showCsvImport && !showScreenshotUpload && (
        <div className="flex items-center justify-between mb-4">
          <CoachBtn
            label="✦ Explain my Portfolio X-Ray"
            question="Explain my Portfolio X-Ray in plain English. Focus on total value, largest holdings, concentration, exposure, overlap notes, and what may be worth understanding."
            onAskCoach={onAskCoach}
            portfolioContext={portfolioContext}
          />
          {onViewReport && (
            <Button variant="secondary" size="sm" onClick={handleViewReport}>
              View Report
            </Button>
          )}
        </div>
      )}

      {/* ── Visual charts ── */}
      <PortfolioCharts
        holdings={holdings}
        totalValue={totalValue}
        assetTypeItems={assetMix.map((m) => ({ label: m.assetType, value: m.value, weight: m.weight }))}
        sectorExposure={sectorExposure}
        geographyExposure={geographyExposure}
        currencyExposure={currencyExposure}
        hasUnmapped={hasUnmapped}
      />

      {/* ── B. Concentration insights ── */}
      {concentrationInsights.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Concentration</h2>
          <p className="text-sm text-slate-500 mb-3">Based on holding weights. Educational only.</p>
          <div className="space-y-4">
            {concentrationInsights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {concentrationInsights.length > 0 && (
        <div className="mb-6">
          <CoachBtn
            label="✦ Explain concentration"
            question="Explain my portfolio concentration in plain English. Focus on largest holding weight, top 3 concentration, and why concentration matters for a beginner investor."
            onAskCoach={onAskCoach}
            portfolioContext={portfolioContext}
          />
        </div>
      )}

      {/* ── C. Exposure breakdown ── */}
      {holdings.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Exposure</h2>
          <p className="text-sm text-slate-500 mb-4">
            Simplified estimates based on static metadata. {METADATA_DISCLAIMER}
          </p>

          {/* Metadata quality bar */}
          <div className="flex items-center gap-2 mb-4 text-xs text-slate-500">
            <span>
              Mapped: <span className="font-semibold text-slate-700">{mappedCount}</span> of{" "}
              <span className="font-semibold text-slate-700">{holdings.length}</span> holdings
            </span>
            {Object.values(enrichedMetadata).some((v) => v !== null) && (
              <span className="text-teal-600 font-medium">· includes FMP data</span>
            )}
          </div>

          {/* Enrichment loading state */}
          {enrichmentStatus === "loading" && (
            <div className="mb-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5">
              <p className="text-xs text-slate-500">Looking up holdings data…</p>
            </div>
          )}

          {/* Unknown holdings detail (after enrichment attempt) */}
          {enrichmentStatus === "done" && hasUnmapped && (
            <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
              <p className="text-xs font-semibold text-amber-700 mb-2">
                {unknownHoldings.length} holding{unknownHoldings.length === 1 ? "" : "s"} could not be mapped
              </p>
              <div className="space-y-1 mb-2">
                {unknownHoldings.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-xs">
                    <span className="text-amber-800 font-medium">{h.ticker || h.name || "Unknown"}</span>
                    <span className="text-amber-600">{fmt(h.marketValue)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-amber-600">
                These holdings are included in portfolio value but may not be fully reflected in sector, geography, or currency exposure estimates.
              </p>
            </div>
          )}

          {/* Asset type mix */}
          {assetMix.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Asset type</p>
              <Card padding="sm">
                <ExposureRows items={assetMix.map((i) => ({ label: i.assetType, value: i.value, weight: i.weight }))} />
              </Card>
            </div>
          )}

          {/* Sector */}
          {sectorExposure.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Sector</p>
              <Card padding="sm">
                <ExposureRows items={sectorExposure} />
              </Card>
            </div>
          )}

          {/* Geography */}
          {geographyExposure.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Geography</p>
              <Card padding="sm">
                <ExposureRows items={geographyExposure} />
              </Card>
            </div>
          )}

          {/* Currency */}
          {currencyExposure.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Currency</p>
              <Card padding="sm">
                <ExposureRows items={currencyExposure} />
                <p className="text-xs text-slate-400 mt-3">
                  Currency exposure is simplified. A Canadian-listed ETF may still hold foreign assets.
                </p>
              </Card>
            </div>
          )}

          {/* Theme insights */}
          {themeToDisplay.length > 0 && (
            <div className="space-y-4">
              {themeToDisplay.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          )}
        </div>
      )}

      {holdings.length > 0 && (
        <div className="mb-6">
          <CoachBtn
            label="✦ Explain exposure"
            question="Explain my sector, geography, currency, and asset type exposure in plain English. Use cautious language and explain that exposure mappings are simplified estimates."
            onAskCoach={onAskCoach}
            portfolioContext={portfolioContext}
          />
        </div>
      )}

      {/* ── D. Overlap notes ── */}
      {overlapToDisplay.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Overlap notes</h2>
          <p className="text-sm text-slate-500 mb-3">
            Potential holding interactions based on simplified static mapping.
          </p>
          <div className="space-y-4">
            {overlapToDisplay.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        </div>
      )}

      {!showAdvancedOverlap && holdings.length > 0 && (overlapInsights.length > 1 || themeInsights.length > 0) && (
        <Card variant="muted" className="mb-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
            Advanced Portfolio Insights
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mb-3">
            Additional overlap notes and theme-level context are part of Premium Portfolio Tools — a calm
            upgrade path when you want expanded analysis, not a requirement to get started.
          </p>
          {onViewPremiumTools && (
            <Button variant="secondary" size="sm" onClick={onViewPremiumTools}>
              Learn about Premium Portfolio Tools
            </Button>
          )}
        </Card>
      )}

      {overlapToDisplay.length > 0 && (
        <div className="mb-6">
          <CoachBtn
            label="✦ Explain overlap"
            question="Explain the overlap notes in my portfolio in plain English. Focus on ETF overlap and individual stocks that may already be represented inside broad ETFs."
            onAskCoach={onAskCoach}
            portfolioContext={portfolioContext}
          />
        </div>
      )}

      {/* ── What this means ── */}
      {holdings.length > 0 && (
        <div className="mb-6">
          <Card variant="highlighted">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-widest mb-2">What this means</p>
            <p className="text-sm text-blue-900 leading-relaxed">
              Portfolio X-Ray helps you understand concentration, asset mix, and estimated exposure based
              on the holdings you enter. It does not decide whether your portfolio is good or bad.
              It highlights areas worth understanding before making future decisions.
            </p>
          </Card>
        </div>
      )}

      {/* ── E. Portfolio Scenarios ── */}
      <PortfolioScenarios
        holdings={holdings}
        totalValue={totalValue}
        sectorExposure={sectorExposure}
        defaultMonthlyContribution={monthlyContribution}
        onAskCoach={onAskCoach && portfolioContext ? (q) => onAskCoach(q, portfolioContext) : undefined}
      />

      {/* ── Save snapshot ── */}
      {holdings.length > 0 && (
        <div className="mb-6">
          <h2 className="text-base font-semibold text-slate-800 mb-1">Save snapshot</h2>
          <p className="text-sm text-slate-500 mb-3">
            Saves a read-only snapshot of the current holdings and analysis. Editing holdings later will not affect saved snapshots.
          </p>
          <Card padding="sm">
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
                  placeholder="e.g. After adding new ETF position, before rebalancing review…"
                  rows={2}
                  className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white resize-none"
                />
                <p className="text-xs text-slate-400 mt-0.5">{reportNotes.length}/300</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleSave} disabled={saveState === "saving"}>
                  {saveState === "saving" ? "Saving…" : "Save snapshot"}
                </Button>
                {saveState === "saved" && (
                  <p className="text-xs text-teal-600 font-medium">Snapshot saved. View it in Saved Reports on the dashboard.</p>
                )}
                {saveState === "error" && (
                  <p className="text-xs text-rose-500 font-medium">Could not save. Please try again.</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      <Disclaimer extended="Educational only. Not financial advice. This analysis is based on the holdings you enter and simplified exposure mappings. It may not reflect current fund holdings, fees, market prices, currency conversion, taxes, or your full financial situation." />

      <Dialog
        open={upgradeMoment !== null}
        onClose={() => setUpgradeMoment(null)}
        title={upgradeMoment ? UPGRADE_COPY[upgradeMoment].title : ""}
        description={upgradeMoment ? UPGRADE_COPY[upgradeMoment].body : undefined}
        primaryLabel={upgradeMoment ? UPGRADE_COPY[upgradeMoment].primaryCta : "OK"}
        onPrimary={() => onViewPremiumTools?.()}
        secondaryLabel="Not now"
        onSecondary={() => {}}
      />
    </PageLayout>
  );
}
