"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import type { Holding, AssetType, AccountType, Currency } from "@/types/portfolio";
import { getMetadata, normalizeTicker } from "@/lib/portfolioMetadata";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

// ─── Column detection ─────────────────────────────────────────────────────────

const TICKER_COLS = [
  "symbol", "ticker", "ticker symbol", "security", "instrument",
  "investment", "product symbol",
];
const NAME_COLS = [
  "name", "description", "security name", "holding", "instrument name",
  "product name", "security description",
];
const VALUE_COLS = [
  "market value", "current value", "market val", "value", "total value",
  "amount", "book value",
];
const QTY_COLS = ["quantity", "shares", "units", "position", "qty"];
const PRICE_COLS = [
  "market price", "last price", "current price", "unit price", "price",
];
const CURRENCY_COLS = ["currency", "currency code", "curr"];
const ACCOUNT_COLS = ["account type", "account name", "account number", "account"];
const ASSET_COLS = [
  "asset type", "investment type", "security type", "type", "category",
];

function detectColumn(headers: string[], candidates: string[]): string {
  const lower = headers.map((h) => h.toLowerCase().replace(/\s+/g, " ").trim());
  for (const c of candidates) {
    const i = lower.indexOf(c);
    if (i >= 0) return headers[i];
  }
  return "";
}

// ─── Value parsing ────────────────────────────────────────────────────────────

function parseCurrencyValue(raw: string): number | null {
  if (!raw?.trim()) return null;
  let s = raw.trim();
  const isNegative = (s.startsWith("(") && s.endsWith(")")) || s.startsWith("-");
  // Remove wrapping parens or leading minus
  s = s.replace(/^\(|\)$/g, "").replace(/^-/, "");
  // Strip currency codes/symbols at start: C$, USD, CAD, $
  s = s.replace(/^(CAD|USD)\s*/i, "").replace(/^C?\$\s*/, "");
  // Strip remaining formatting
  s = s.replace(/[$,\s]/g, "");
  if (!s) return null;
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return isNegative ? -n : n;
}

// ─── Asset type inference ─────────────────────────────────────────────────────

function inferAssetType(ticker: string, name: string): AssetType {
  if (ticker) {
    const meta = getMetadata(normalizeTicker(ticker));
    if (meta) return meta.assetType;
  }
  const lower = name.toLowerCase();
  if (/\bbond\b/.test(lower) || /fixed income/.test(lower)) return "Bond ETF";
  if (/\betf\b/.test(lower)) return "ETF";
  if (/mutual fund/.test(lower)) return "Mutual Fund";
  if (/\bfund\b/.test(lower)) return "ETF";
  if (/\bcash\b/.test(lower) || /hisa/.test(lower) || /money market/.test(lower) || /savings/.test(lower)) return "Cash";
  return "Other";
}

// ─── Account type mapping ─────────────────────────────────────────────────────

function mapAccountType(raw: string): AccountType {
  const s = raw.trim().toUpperCase();
  if (s.includes("TFSA")) return "TFSA";
  if (s.includes("RRSP")) return "RRSP";
  if (s.includes("FHSA")) return "FHSA";
  if (s.includes("RESP")) return "RESP";
  if (s.includes("NON") || s.includes("TAXABLE") || s.includes("MARGIN") || s.includes("CASH ACCOUNT")) return "Non-registered";
  return "Unknown";
}

// ─── Row-level helpers ────────────────────────────────────────────────────────

function resolveMarketValue(
  row: Record<string, string>,
  mapping: ColumnMapping
): number | null {
  const direct = mapping.marketValue ? parseCurrencyValue(row[mapping.marketValue] ?? "") : null;
  if (direct !== null && direct > 0) return direct;
  if (mapping.quantity && mapping.marketPrice) {
    const qty = parseCurrencyValue(row[mapping.quantity] ?? "");
    const price = parseCurrencyValue(row[mapping.marketPrice] ?? "");
    if (qty !== null && qty > 0 && price !== null && price > 0) return qty * price;
  }
  return null;
}

// ─── Preview computation (derived, no side effects) ───────────────────────────

interface PreviewStats {
  ready: number;
  withWarnings: number;
  skipped: number;
  estimatedTotal: number;
  hasMixedCurrencies: boolean;
  hasDuplicates: boolean;
}

function computePreview(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  importMode: ImportMode,
  existingHoldings: Holding[]
): PreviewStats {
  const existingTickers = new Set(existingHoldings.map((h) => h.ticker.toUpperCase()).filter(Boolean));
  const seenCurrencies = new Set<string>();
  let ready = 0, withWarnings = 0, skipped = 0, estimatedTotal = 0, hasDuplicates = false;

  for (const row of rows) {
    const ticker = mapping.ticker ? (row[mapping.ticker] ?? "").trim().toUpperCase() : "";
    const name   = mapping.name   ? (row[mapping.name]   ?? "").trim()              : "";
    if (!ticker && !name) { skipped++; continue; }

    const mv = resolveMarketValue(row, mapping);
    if (!mv || mv <= 0) { skipped++; continue; }

    estimatedTotal += mv;

    const rawCurrency = mapping.currency ? (row[mapping.currency] ?? "").trim().toUpperCase() : "";
    if (rawCurrency) seenCurrencies.add(rawCurrency);

    if (importMode === "add" && ticker && existingTickers.has(ticker)) hasDuplicates = true;

    if (!ticker) withWarnings++;
    else ready++;
  }

  const cadSeen = seenCurrencies.has("CAD") || seenCurrencies.has("CAD-LISTED");
  const usdSeen = seenCurrencies.has("USD");
  return { ready, withWarnings, skipped, estimatedTotal, hasMixedCurrencies: cadSeen && usdSeen, hasDuplicates };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ColumnMapping {
  ticker: string;
  name: string;
  marketValue: string;
  quantity: string;
  marketPrice: string;
  currency: string;
  accountType: string;
  assetType: string;
}

interface RowWarning {
  rowIndex: number;
  display: string;
  reason: string;
}

interface ImportResult {
  imported: number;
  skipped: number;
  skippedWarnings: RowWarning[];
  importWarnings: RowWarning[];
  hasCurrencyDefault: boolean;
  hasDuplicates: boolean;
  unmappedCount: number;
}

export type ImportMode = "add" | "replace";
type ImportState = "idle" | "previewing" | "done";

interface Props {
  existingHoldings: Holding[];
  onImport: (holdings: Holding[], mode: ImportMode) => void;
  onCancel: () => void;
}

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputClass =
  "w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white";
const labelClass = "block text-xs font-medium text-slate-500 mb-1";

const EMPTY_MAPPING: ColumnMapping = {
  ticker: "", name: "", marketValue: "", quantity: "",
  marketPrice: "", currency: "", accountType: "", assetType: "",
};

const MAPPED_FIELDS: Array<{ key: keyof ColumnMapping; label: string }> = [
  { key: "ticker",      label: "Ticker / Symbol"    },
  { key: "name",        label: "Name / Description" },
  { key: "marketValue", label: "Market Value"        },
  { key: "quantity",    label: "Quantity"            },
  { key: "marketPrice", label: "Market Price"        },
  { key: "currency",    label: "Currency"            },
  { key: "accountType", label: "Account Type"        },
  { key: "assetType",   label: "Asset Type"          },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CsvImport({ existingHoldings, onImport, onCancel }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importState, setImportState] = useState<ImportState>("idle");
  const [parseError, setParseError] = useState<string | null>(null);
  const [csvRows, setCsvRows] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>(EMPTY_MAPPING);
  const [importMode, setImportMode] = useState<ImportMode>("add");
  const [result, setResult] = useState<ImportResult | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        const rows = results.data;
        if (headers.length === 0 || rows.length === 0) {
          setParseError("The file appears to be empty or has no recognisable columns.");
          return;
        }
        setCsvHeaders(headers);
        setCsvRows(rows);
        setMapping({
          ticker:      detectColumn(headers, TICKER_COLS),
          name:        detectColumn(headers, NAME_COLS),
          marketValue: detectColumn(headers, VALUE_COLS),
          quantity:    detectColumn(headers, QTY_COLS),
          marketPrice: detectColumn(headers, PRICE_COLS),
          currency:    detectColumn(headers, CURRENCY_COLS),
          accountType: detectColumn(headers, ACCOUNT_COLS),
          assetType:   detectColumn(headers, ASSET_COLS),
        });
        setImportState("previewing");
      },
      error: () => setParseError("Could not parse the file. Make sure it is a valid CSV."),
    });
    e.target.value = "";
  }

  function handleImport() {
    const holdings: Holding[] = [];
    const skippedWarnings: RowWarning[] = [];
    const importWarnings: RowWarning[] = [];
    let hasCurrencyDefault = false;
    const existingTickers = new Set(existingHoldings.map((h) => h.ticker.toUpperCase()).filter(Boolean));
    let hasDuplicates = false;

    csvRows.forEach((row, i) => {
      const ticker = mapping.ticker ? (row[mapping.ticker] ?? "").trim().toUpperCase() : "";
      const name   = mapping.name   ? (row[mapping.name]   ?? "").trim()              : "";
      const display = ticker || name || `Row ${i + 1}`;

      if (!ticker && !name) {
        skippedWarnings.push({ rowIndex: i + 1, display: `Row ${i + 1}`, reason: "No ticker or name found." });
        return;
      }

      const marketValue = resolveMarketValue(row, mapping);
      if (!marketValue || marketValue <= 0) {
        skippedWarnings.push({ rowIndex: i + 1, display, reason: "Missing market value or quantity/price." });
        return;
      }

      const quantity    = mapping.quantity    ? parseCurrencyValue(row[mapping.quantity]    ?? "") : null;
      const marketPrice = mapping.marketPrice ? parseCurrencyValue(row[mapping.marketPrice] ?? "") : null;

      // Currency
      let currency: Currency = "CAD";
      const rawCurrency = mapping.currency ? (row[mapping.currency] ?? "").trim().toUpperCase() : "";
      if (rawCurrency === "USD") {
        currency = "USD";
      } else if (rawCurrency === "CAD" || rawCurrency === "CAD-LISTED") {
        currency = "CAD";
      } else {
        let gotFromMeta = false;
        if (ticker) {
          const meta = getMetadata(normalizeTicker(ticker));
          if (meta) {
            const metaCurrencies = Object.keys(meta.currencyExposure ?? {});
            if (metaCurrencies.length === 1 && metaCurrencies[0] === "USD") {
              currency = "USD"; gotFromMeta = true;
            } else if (metaCurrencies.length > 0) {
              gotFromMeta = true;
            }
          }
        }
        if (!gotFromMeta) hasCurrencyDefault = true;
      }

      // Account type
      const rawAccount = mapping.accountType ? (row[mapping.accountType] ?? "") : "";
      const accountType: AccountType = rawAccount.trim() ? mapAccountType(rawAccount) : "Unknown";

      // Asset type
      let assetType: AssetType;
      const rawAsset = mapping.assetType ? (row[mapping.assetType] ?? "").toLowerCase().trim() : "";
      if (rawAsset) {
        if (rawAsset.includes("bond") || rawAsset.includes("fixed income")) assetType = "Bond ETF";
        else if (rawAsset.includes("etf")) assetType = "ETF";
        else if (rawAsset.includes("mutual fund") || rawAsset.includes("fund")) assetType = "Mutual Fund";
        else if (rawAsset.includes("stock") || rawAsset.includes("equity") || rawAsset.includes("share")) assetType = "Stock";
        else if (rawAsset.includes("cash") || rawAsset.includes("money market") || rawAsset.includes("hisa")) assetType = "Cash";
        else assetType = inferAssetType(ticker, name);
      } else {
        assetType = inferAssetType(ticker, name);
      }

      if (importMode === "add" && ticker && existingTickers.has(ticker)) hasDuplicates = true;

      // Warn if no ticker (holding will have limited exposure mapping)
      if (!ticker) {
        importWarnings.push({ rowIndex: i + 1, display: name, reason: "No ticker found. This holding may have limited exposure mapping." });
      }

      holdings.push({
        id: crypto.randomUUID(),
        ticker,
        name,
        assetType,
        accountType,
        currency,
        quantity:    quantity    !== null && quantity    > 0 ? quantity    : null,
        marketPrice: marketPrice !== null && marketPrice > 0 ? marketPrice : null,
        marketValue,
        source: "manual",
        createdAt: new Date().toISOString(),
      });
    });

    const unmappedCount = holdings.filter(
      (h) => h.ticker && !getMetadata(normalizeTicker(h.ticker))
    ).length;

    setResult({ imported: holdings.length, skipped: skippedWarnings.length, skippedWarnings, importWarnings, hasCurrencyDefault, hasDuplicates, unmappedCount });
    onImport(holdings, importMode);
    setImportState("done");
  }

  function reset() {
    setImportState("idle");
    setParseError(null);
    setCsvRows([]);
    setCsvHeaders([]);
    setMapping(EMPTY_MAPPING);
    setResult(null);
    setImportMode("add");
  }

  // ── Idle ──────────────────────────────────────────────────────────────────────

  if (importState === "idle") {
    return (
      <Card>
        <p className="text-sm font-semibold text-slate-800 mb-1">Upload holdings CSV</p>
        <p className="text-sm text-slate-500 mb-3 leading-relaxed">
          Upload a CSV from your brokerage or portfolio tracker to speed up Portfolio X-Ray.
        </p>

        <p className="text-xs text-slate-500 mb-4 leading-relaxed">
          Your CSV only needs a ticker/symbol and market value to get started. Holding name,
          quantity, price, currency, account type, and asset type are helpful but optional.
        </p>

        {/* Expandable column guide */}
        <details className="mb-4 group">
          <summary className="text-xs font-medium text-blue-600 hover:text-blue-800 cursor-pointer list-none flex items-center gap-1 select-none">
            <span className="transition-transform group-open:rotate-90 inline-block">▶</span>
            CSV column guide
          </summary>
          <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 space-y-3 text-xs">
            <div>
              <p className="font-semibold text-slate-600 mb-1">Required</p>
              <ul className="space-y-0.5 text-slate-500 list-disc list-inside">
                <li>Ticker or Symbol</li>
                <li>Market Value <span className="text-slate-400">(or Quantity + Price)</span></li>
              </ul>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <p className="font-semibold text-slate-600 mb-1">Optional but helpful</p>
              <ul className="space-y-0.5 text-slate-500 list-disc list-inside">
                <li>Holding Name or Description</li>
                <li>Quantity</li>
                <li>Market Price</li>
                <li>Currency</li>
                <li>Account Type</li>
                <li>Asset Type</li>
              </ul>
            </div>
            <div className="border-t border-slate-200 pt-3 space-y-1.5">
              <p className="font-semibold text-slate-600 mb-1">Accepted column name examples</p>
              {[
                ["Ticker",       "Symbol, Ticker, Ticker Symbol, Security, Instrument, Investment, Product Symbol"],
                ["Name",         "Name, Description, Security Name, Holding, Instrument Name, Product Name, Security Description"],
                ["Market Value", "Market Value, Current Value, Value, Amount, Total Value, Book Value"],
                ["Quantity",     "Quantity, Shares, Units, Position, Qty"],
                ["Price",        "Price, Market Price, Last Price, Current Price, Unit Price"],
                ["Currency",     "Currency, Currency Code, Curr"],
                ["Account Type", "Account, Account Type, Account Name, Account Number"],
                ["Asset Type",   "Asset Type, Type, Category, Security Type, Investment Type"],
              ].map(([field, examples]) => (
                <p key={field} className="text-slate-500">
                  <span className="font-medium text-slate-600">{field}:</span> {examples}
                </p>
              ))}
            </div>
            <p className="border-t border-slate-200 pt-3 text-slate-400">
              If your CSV uses different column names, you&apos;ll be able to map them before importing.
            </p>
          </div>
        </details>

        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        <Button onClick={() => fileInputRef.current?.click()}>Choose CSV file</Button>
        {parseError && <p className="text-xs text-rose-500 mt-3">{parseError}</p>}

        <div className="mt-4 space-y-1.5">
          <p className="text-xs text-slate-400">
            CSV files are parsed in your browser. The raw file is not stored.
          </p>
          <p className="text-xs text-slate-400">
            Not sure what to upload? Export your holdings or positions list from your brokerage if available.
          </p>
          <p className="text-xs text-slate-400">Educational only. Not financial advice.</p>
        </div>
      </Card>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────────

  if (importState === "done" && result) {
    const summaryParts: string[] = [];
    if (result.imported > 0) summaryParts.push(`Imported ${result.imported} holding${result.imported === 1 ? "" : "s"}.`);
    if (result.skipped > 0) summaryParts.push(`${result.skipped} row${result.skipped === 1 ? "" : "s"} skipped.`);
    if (result.unmappedCount > 0) summaryParts.push(`${result.unmappedCount} holding${result.unmappedCount === 1 ? "" : "s"} could not be fully mapped and may show as Unknown in exposure breakdowns.`);

    return (
      <Card>
        <p className="text-sm font-semibold text-slate-800 mb-2">
          {result.imported > 0 ? "Import complete" : "No holdings imported"}
        </p>
        <p className="text-sm text-slate-600 mb-3 leading-relaxed">{summaryParts.join(" ")}</p>

        {result.hasCurrencyDefault && (
          <p className="text-xs text-amber-600 mb-1.5">
            Rows without a recognised currency were defaulted to CAD.
          </p>
        )}
        {result.hasDuplicates && (
          <p className="text-xs text-slate-500 mb-1.5">
            Some tickers already existed in your holdings. They were added as separate rows.
          </p>
        )}
        {result.importWarnings.length > 0 && (
          <div className="mt-2 space-y-1">
            {result.importWarnings.map((w) => (
              <p key={`iw-${w.rowIndex}`} className="text-xs text-amber-600">
                {w.display}: {w.reason}
              </p>
            ))}
          </div>
        )}
        {result.skippedWarnings.length > 0 && (
          <div className="mt-3 border-t border-slate-100 pt-3 space-y-1">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Skipped rows
            </p>
            {result.skippedWarnings.map((w) => (
              <p key={`sw-${w.rowIndex}`} className="text-xs text-slate-400">
                Row {w.rowIndex} — {w.display}: {w.reason}
              </p>
            ))}
          </div>
        )}
        <div className="flex items-center gap-3 mt-4">
          <Button variant="secondary" onClick={reset}>Import another file</Button>
          <Button variant="ghost" onClick={onCancel}>Done</Button>
        </div>
      </Card>
    );
  }

  // ── Previewing ────────────────────────────────────────────────────────────────

  const canImport =
    Boolean(mapping.ticker || mapping.name) &&
    Boolean(mapping.marketValue || (mapping.quantity && mapping.marketPrice));

  const preview = computePreview(csvRows, mapping, importMode, existingHoldings);
  const previewRows = csvRows.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Raw data preview */}
      <Card>
        <p className="text-sm font-semibold text-slate-800 mb-1">
          {csvRows.length} row{csvRows.length === 1 ? "" : "s"} detected
        </p>
        <p className="text-xs text-slate-400 mb-3">Review the detected columns before importing.</p>
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="text-xs w-full">
            <thead>
              <tr>
                {csvHeaders.map((h) => (
                  <th key={h} className="text-left text-slate-500 font-semibold pr-4 pb-2 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, i) => (
                <tr key={i} className="border-t border-slate-100">
                  {csvHeaders.map((h) => (
                    <td
                      key={h}
                      className="pr-4 py-1.5 text-slate-600 whitespace-nowrap max-w-[120px] truncate"
                      title={row[h] ?? ""}
                    >
                      {row[h] ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {csvRows.length > 5 && (
          <p className="text-xs text-slate-400 mt-2">Showing 5 of {csvRows.length} rows.</p>
        )}
      </Card>

      {/* Column mapping */}
      <Card>
        <p className="text-sm font-semibold text-slate-800 mb-1">Map columns</p>
        <p className="text-xs text-slate-400 mb-4">
          At least one of Ticker or Name is required. Map Market Value, or Quantity + Price
          to calculate it.
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          {MAPPED_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <label className={labelClass}>{label}</label>
              <select
                value={mapping[key]}
                onChange={(e) => setMapping((prev) => ({ ...prev, [key]: e.target.value }))}
                className={inputClass}
              >
                <option value="">(not mapped)</option>
                {csvHeaders.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </Card>

      {/* Import mode */}
      <Card>
        <p className="text-sm font-semibold text-slate-800 mb-3">Import mode</p>
        <div className="space-y-2.5">
          {(["add", "replace"] as ImportMode[]).map((mode) => (
            <label key={mode} className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="radio"
                name="importMode"
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

      {/* Pre-import summary */}
      {canImport && (
        <Card>
          <p className="text-sm font-semibold text-slate-800 mb-3">Import summary</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs mb-3">
            <div>
              <p className="text-slate-400">Total rows</p>
              <p className="font-semibold text-slate-700">{csvRows.length}</p>
            </div>
            <div>
              <p className="text-slate-400">Ready to import</p>
              <p className="font-semibold text-slate-700">{preview.ready + preview.withWarnings}</p>
            </div>
            {preview.withWarnings > 0 && (
              <div>
                <p className="text-slate-400">With warnings</p>
                <p className="font-semibold text-amber-600">{preview.withWarnings}</p>
              </div>
            )}
            {preview.skipped > 0 && (
              <div>
                <p className="text-slate-400">Will be skipped</p>
                <p className="font-semibold text-slate-500">{preview.skipped}</p>
              </div>
            )}
            {preview.estimatedTotal > 0 && (
              <div className="col-span-2">
                <p className="text-slate-400">Estimated total value</p>
                <p className="font-semibold text-slate-700">
                  ${preview.estimatedTotal.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
          {preview.hasMixedCurrencies && (
            <p className="text-xs text-amber-600 mt-1">
              Multiple currencies detected. Portfolio totals use entered values and do not apply currency conversion yet.
            </p>
          )}
          {preview.hasDuplicates && importMode === "add" && (
            <p className="text-xs text-slate-500 mt-1.5">
              Some imported tickers already exist in your current holdings.
            </p>
          )}
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleImport} disabled={!canImport}>
          Import {preview.ready + preview.withWarnings} holding{(preview.ready + preview.withWarnings) === 1 ? "" : "s"} →
        </Button>
        <Button variant="ghost" onClick={() => { reset(); onCancel(); }}>
          Cancel
        </Button>
      </div>
      {!canImport && (
        <p className="text-xs text-rose-500">
          Map at least one of Ticker or Name, and Market Value (or Quantity + Price), before importing.
        </p>
      )}
    </div>
  );
}
