"use client";

import { useState, useRef, useEffect } from "react";
import type { Holding, AssetType, AccountType, Currency } from "@/types/portfolio";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ScreenshotImportMode = "add" | "replace";

interface ExtractedHolding {
  ticker: string | null;
  name: string | null;
  assetType: string | null;
  quantity: number | null;
  marketPrice: number | null;
  marketValue: number | null;
  currency: string | null;
  accountType: string | null;
  confidence: number;
  notes: string[];
}

interface ExtractionResult {
  status: "ready_to_review" | "needs_clearer_image" | "unsupported" | "error";
  confidence: number;
  extractedHoldings: ExtractedHolding[];
  warnings: string[];
  summary: string;
}

interface ReviewRow {
  id: string;
  selected: boolean;
  ticker: string;
  name: string;
  assetType: string;
  quantity: string;
  marketPrice: string;
  marketValue: string;
  currency: string;
  accountType: string;
  confidence: number;
  notes: string[];
}

interface Props {
  existingHoldings: Holding[];
  onImport: (holdings: Holding[], mode: ScreenshotImportMode) => void;
  onCancel: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ASSET_TYPES = ["Stock", "ETF", "Mutual Fund", "Bond ETF", "Cash", "Other"];
const ACCOUNT_TYPES = ["TFSA", "RRSP", "FHSA", "Non-registered", "RESP", "Other", "Unknown"];
const CURRENCIES = ["CAD", "USD"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

const inputClass =
  "w-full text-xs border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-300 bg-white";
const labelClass = "block text-xs font-medium text-slate-400 mb-0.5";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function confidenceBadge(c: number): "default" | "caution" | "danger" {
  if (c >= 0.8) return "default";
  if (c >= 0.5) return "caution";
  return "danger";
}

function confidenceLabel(c: number): string {
  if (c >= 0.8) return "High confidence";
  if (c >= 0.5) return "Medium confidence";
  return "Low confidence";
}

function toReviewRow(h: ExtractedHolding, index: number): ReviewRow {
  let mv = h.marketValue !== null ? String(h.marketValue) : "";
  if (!mv && h.quantity !== null && h.marketPrice !== null) {
    mv = (h.quantity * h.marketPrice).toFixed(2);
  }
  return {
    id: `extracted-${index}-${Date.now()}`,
    selected: parseFloat(mv) > 0,
    ticker: h.ticker ?? "",
    name: h.name ?? "",
    assetType: ASSET_TYPES.includes(h.assetType ?? "") ? (h.assetType ?? "Stock") : "Stock",
    quantity: h.quantity !== null ? String(h.quantity) : "",
    marketPrice: h.marketPrice !== null ? String(h.marketPrice) : "",
    marketValue: mv,
    currency: CURRENCIES.includes(h.currency ?? "") ? (h.currency ?? "CAD") : "CAD",
    accountType: ACCOUNT_TYPES.includes(h.accountType ?? "") ? (h.accountType ?? "Unknown") : "Unknown",
    confidence: h.confidence,
    notes: h.notes ?? [],
  };
}

function rowToHolding(row: ReviewRow): Holding | null {
  const mv = parseFloat(row.marketValue);
  if (!mv || mv <= 0) return null;
  if (!row.ticker.trim() && !row.name.trim()) return null;

  const qty = parseFloat(row.quantity);
  const price = parseFloat(row.marketPrice);

  return {
    id: crypto.randomUUID(),
    ticker: row.ticker.trim().toUpperCase(),
    name: row.name.trim(),
    assetType: (ASSET_TYPES.includes(row.assetType) ? row.assetType : "Stock") as AssetType,
    accountType: (ACCOUNT_TYPES.includes(row.accountType)
      ? row.accountType
      : "Unknown") as AccountType,
    currency: (CURRENCIES.includes(row.currency) ? row.currency : "CAD") as Currency,
    quantity: !isNaN(qty) && qty > 0 ? qty : null,
    marketPrice: !isNaN(price) && price > 0 ? price : null,
    marketValue: mv,
    source: "manual",
    createdAt: new Date().toISOString(),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

type Phase = "idle" | "selected" | "loading" | "review" | "error";

export default function ScreenshotUpload({ onImport, onCancel }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState("Uploading image…");
  const [isSlow, setIsSlow] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [importMode, setImportMode] = useState<ScreenshotImportMode>("add");

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  function setPreview(url: string | null) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = url;
    setPreviewUrl(url);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setFileError(null);

    if (!ALLOWED_TYPES.includes(f.type)) {
      setFileError("Unsupported file type. Please upload a PNG, JPG, or WebP image.");
      return;
    }
    if (f.size > MAX_SIZE_BYTES) {
      setFileError(
        "Image is too large. Try cropping the screenshot to just the holdings table."
      );
      return;
    }

    setFile(f);
    setPreview(URL.createObjectURL(f));
    setPhase("selected");
  }

  async function handleExtract() {
    if (!file) return;
    setPhase("loading");
    setIsSlow(false);
    setProgressMsg("Uploading image…");
    setExtractionError(null);

    const msgTimer = setTimeout(() => setProgressMsg("Extracting holdings…"), 2500);
    const slowTimer = setTimeout(() => setIsSlow(true), 12000);
    const controller = new AbortController();
    const abortTimer = setTimeout(() => controller.abort(), 60000);

    function cleanup() {
      clearTimeout(msgTimer);
      clearTimeout(slowTimer);
      clearTimeout(abortTimer);
    }

    try {
      const fd = new FormData();
      fd.append("image", file);

      const res = await fetch("/api/extract-holdings-image", {
        method: "POST",
        body: fd,
        signal: controller.signal,
      });

      cleanup();

      if (res.status === 413) {
        setExtractionError(
          "Image is too large. Try cropping the screenshot to just the holdings table."
        );
        setPhase("error");
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setExtractionError(
          data.error ?? "Extraction failed. You can still use CSV upload or manual entry."
        );
        setPhase("error");
        return;
      }

      const data = await res.json() as ExtractionResult;
      setResult(data);

      if (data.status === "needs_clearer_image") {
        setExtractionError(
          "Could not find holdings in this image. Try a clearer screenshot that includes ticker and market value."
        );
        setPhase("error");
        return;
      }
      if (data.status === "unsupported") {
        setExtractionError(
          "This image does not appear to show a holdings list. Try a screenshot of your holdings or positions page."
        );
        setPhase("error");
        return;
      }
      if (data.status === "error" || data.extractedHoldings.length === 0) {
        setExtractionError(
          "Could not find holdings in this image. Try a clearer screenshot that includes ticker and market value."
        );
        setPhase("error");
        return;
      }

      setRows(data.extractedHoldings.map(toReviewRow));
      setPhase("review");
    } catch (err) {
      cleanup();
      if ((err as Error).name === "AbortError") {
        setExtractionError(
          "The request timed out. Try a smaller or cropped screenshot, or use CSV upload."
        );
      } else {
        setExtractionError("Extraction failed. You can still use CSV upload or manual entry.");
      }
      setPhase("error");
    }
  }

  function updateRow(id: string, updates: Partial<ReviewRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }

  function deleteRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function handleImport() {
    const holdings: Holding[] = [];
    for (const row of rows) {
      if (!row.selected) continue;
      const h = rowToHolding(row);
      if (h) holdings.push(h);
    }
    if (holdings.length === 0) return;
    onImport(holdings, importMode);
  }

  function reset() {
    setPhase("idle");
    setFile(null);
    setPreview(null);
    setFileError(null);
    setExtractionError(null);
    setResult(null);
    setRows([]);
    setIsSlow(false);
    setProgressMsg("Uploading image…");
  }

  const importableCount = rows.filter((r) => {
    if (!r.selected) return false;
    return parseFloat(r.marketValue) > 0 && (r.ticker.trim() || r.name.trim());
  }).length;

  const skippedSelectedCount =
    rows.filter((r) => r.selected).length - importableCount;

  // ── Idle ──────────────────────────────────────────────────────────────────────

  if (phase === "idle") {
    return (
      <Card>
        <p className="text-sm font-semibold text-slate-800 mb-1">Upload holdings screenshot</p>
        <p className="text-sm text-slate-500 mb-1 leading-relaxed">
          Upload a screenshot of your holdings list. The app will try to extract tickers, names,
          quantities, prices, and values for review.
        </p>
        <p className="text-xs text-slate-400 mb-4 leading-relaxed">
          Best results come from clear screenshots that show ticker/symbol and market value.
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button onClick={() => fileInputRef.current?.click()}>Choose image</Button>
        {fileError && <p className="text-xs text-rose-500 mt-3">{fileError}</p>}

        <div className="mt-4 space-y-1.5">
          <p className="text-xs text-slate-400 leading-relaxed">
            Screenshots are used only to extract holdings for your review. Do not upload screenshots
            with account numbers, addresses, or other personal information.
          </p>
          <p className="text-xs text-slate-400 leading-relaxed">
            Your image is sent to an AI provider for extraction and is not stored by this app.
          </p>
          <p className="text-xs text-slate-400">
            Accepted formats: PNG, JPG, WebP · Max 10 MB
          </p>
          <p className="text-xs text-slate-400">Educational only. Not financial advice.</p>
        </div>
      </Card>
    );
  }

  // ── Selected ──────────────────────────────────────────────────────────────────

  if (phase === "selected" && file && previewUrl) {
    return (
      <Card>
        <p className="text-sm font-semibold text-slate-800 mb-3">Review before extracting</p>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={previewUrl}
          alt="Holdings screenshot preview"
          className="w-full max-h-56 object-contain rounded-xl border border-slate-200 bg-slate-50 mb-3"
        />

        <p className="text-xs text-slate-500 mb-4">
          <span className="font-medium text-slate-600">{file.name}</span>
          {" · "}
          {(file.size / 1024).toFixed(0)} KB
        </p>

        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5">
          <p className="text-xs text-amber-700 leading-relaxed">
            Do not upload screenshots with account numbers, addresses, or personal information.
            Your image is sent to an AI provider for extraction and is not stored by this app.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleExtract}>Extract holdings</Button>
          <Button variant="ghost" onClick={reset}>Choose different image</Button>
        </div>
      </Card>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <Card>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin shrink-0" />
          <p className="text-sm font-medium text-slate-700">{progressMsg}</p>
        </div>
        {isSlow && (
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            This is taking longer than expected. You can cancel and continue entering holdings
            manually, or try a cropped image.
          </p>
        )}
        <p className="text-xs text-slate-400 mt-3">Do not close this tab during extraction.</p>
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={() => { reset(); onCancel(); }}>
            Cancel
          </Button>
        </div>
      </Card>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────────

  if (phase === "error") {
    return (
      <Card>
        <p className="text-sm font-semibold text-slate-800 mb-1">Could not extract holdings</p>
        <p className="text-sm text-slate-500 mb-4 leading-relaxed">
          {extractionError ?? "Extraction failed. You can still use CSV upload or manual entry."}
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={reset}>Try a different image</Button>
          <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
      </Card>
    );
  }

  // ── Review ────────────────────────────────────────────────────────────────────

  if (phase === "review" && result) {
    return (
      <div className="space-y-4">
        {/* Summary */}
        <Card>
          <p className="text-sm font-semibold text-slate-800 mb-1">
            {result.extractedHoldings.length} holding
            {result.extractedHoldings.length === 1 ? "" : "s"} found — review before importing
          </p>
          <p className="text-sm text-slate-500 mb-3 leading-relaxed">{result.summary}</p>

          {result.warnings.length > 0 && (
            <div className="space-y-1 mb-3">
              {result.warnings.map((w, i) => (
                <p key={i} className="text-xs text-amber-600">
                  {w}
                </p>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Check each row — edit or remove before importing.</span>
            <button
              onClick={() => setRows((prev) => prev.map((r) => ({ ...r, selected: true })))}
              className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
            >
              Select all
            </button>
          </div>
        </Card>

        {/* Review rows */}
        {rows.map((row, i) => {
          const mv = parseFloat(row.marketValue);
          const canImportRow = mv > 0 && (row.ticker.trim().length > 0 || row.name.trim().length > 0);

          return (
            <Card key={row.id} padding="sm">
              <div className="flex items-start justify-between gap-2 mb-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={(e) => updateRow(row.id, { selected: e.target.checked })}
                    className="accent-blue-600"
                  />
                  <span className="text-xs font-semibold text-slate-600">Row {i + 1}</span>
                </label>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={confidenceBadge(row.confidence)}>
                    {confidenceLabel(row.confidence)}
                  </Badge>
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="text-xs text-slate-300 hover:text-rose-500 cursor-pointer transition-colors leading-none"
                    title="Remove row"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-3 mb-3">
                <div>
                  <label className={labelClass}>Ticker</label>
                  <input
                    type="text"
                    value={row.ticker}
                    onChange={(e) => updateRow(row.id, { ticker: e.target.value })}
                    placeholder="e.g. VFV"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Name</label>
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => updateRow(row.id, { name: e.target.value })}
                    placeholder="Holding name"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Asset type</label>
                  <select
                    value={row.assetType}
                    onChange={(e) => updateRow(row.id, { assetType: e.target.value })}
                    className={inputClass}
                  >
                    {ASSET_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Account type</label>
                  <select
                    value={row.accountType}
                    onChange={(e) => updateRow(row.id, { accountType: e.target.value })}
                    className={inputClass}
                  >
                    {ACCOUNT_TYPES.map((t) => (
                      <option key={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Quantity</label>
                  <input
                    type="number"
                    min="0"
                    value={row.quantity}
                    onChange={(e) => updateRow(row.id, { quantity: e.target.value })}
                    placeholder="e.g. 10"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Market price</label>
                  <input
                    type="number"
                    min="0"
                    value={row.marketPrice}
                    onChange={(e) => updateRow(row.id, { marketPrice: e.target.value })}
                    placeholder="e.g. 125.50"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Market value</label>
                  <input
                    type="number"
                    min="0"
                    value={row.marketValue}
                    onChange={(e) => updateRow(row.id, { marketValue: e.target.value })}
                    placeholder="e.g. 1255.00"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Currency</label>
                  <select
                    value={row.currency}
                    onChange={(e) => updateRow(row.id, { currency: e.target.value })}
                    className={inputClass}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {row.selected && !canImportRow && (
                <p className="text-xs text-rose-500 mb-2">
                  Missing market value or quantity/price — edit to enable import.
                </p>
              )}

              {row.notes.length > 0 && (
                <div className="border-t border-slate-100 pt-2 space-y-0.5">
                  {row.notes.map((note, ni) => (
                    <p key={ni} className="text-xs text-slate-400">
                      {note}
                    </p>
                  ))}
                </div>
              )}
            </Card>
          );
        })}

        {rows.length === 0 && (
          <Card>
            <p className="text-sm text-slate-500">
              All rows removed. Try a different image or use manual entry.
            </p>
          </Card>
        )}

        {/* Import mode */}
        <Card>
          <p className="text-sm font-semibold text-slate-800 mb-3">Import mode</p>
          <div className="space-y-2.5">
            {(["add", "replace"] as ScreenshotImportMode[]).map((mode) => (
              <label key={mode} className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="radio"
                  name="screenshotImportMode"
                  value={mode}
                  checked={importMode === mode}
                  onChange={() => setImportMode(mode)}
                  className="accent-blue-600 mt-0.5 shrink-0"
                />
                <span className="text-sm text-slate-700">
                  {mode === "add" ? "Add to current holdings" : "Replace current holdings"}
                </span>
              </label>
            ))}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleImport} disabled={importableCount === 0}>
            Import {importableCount} holding{importableCount === 1 ? "" : "s"} →
          </Button>
          <Button variant="secondary" onClick={reset}>
            Try a different image
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
        {skippedSelectedCount > 0 && (
          <p className="text-xs text-amber-600">
            {skippedSelectedCount} selected row{skippedSelectedCount === 1 ? "" : "s"} will be
            skipped — missing market value or quantity/price.
          </p>
        )}
      </div>
    );
  }

  return null;
}
