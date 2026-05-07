"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import type { Holding, AssetType, AccountType, Currency } from "@/types/portfolio";
import { getMetadata, normalizeTicker } from "@/lib/portfolioMetadata";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

// ─── Column detection ─────────────────────────────────────────────────────────

const TICKER_COLS = ["symbol", "ticker", "ticker symbol", "security", "instrument"];
const NAME_COLS = ["name", "description", "security name", "holding", "instrument name"];
const VALUE_COLS = ["market value", "value", "current value", "amount", "total value"];
const QTY_COLS = ["quantity", "shares", "units"];
const PRICE_COLS = ["price", "market price", "last price", "current price"];
const CURRENCY_COLS = ["currency", "currency code"];
const ACCOUNT_COLS = ["account", "account type", "account name"];
const ASSET_COLS = ["asset type", "type", "category", "security type"];

function detectColumn(headers: string[], candidates: string[]): string {
  const lower = headers.map((h) => h.toLowerCase().trim());
  for (const c of candidates) {
    const i = lower.indexOf(c);
    if (i >= 0) return headers[i];
  }
  return "";
}

// ─── Value parsing ────────────────────────────────────────────────────────────

function parseCurrencyValue(raw: string): number | null {
  if (!raw?.trim()) return null;
  const trimmed = raw.trim();
  const isNegative = /^\(.*\)$/.test(trimmed);
  const cleaned = trimmed.replace(/[$,\s()]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
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
  warnings: RowWarning[];
  hasCurrencyDefault: boolean;
  hasDuplicates: boolean;
}

export type ImportMode = "add" | "replace";
type ImportState = "idle" | "previewing" | "done";

interface Props {
  existingHoldings: Holding[];
  onImport: (holdings: Holding[], mode: ImportMode) => void;
  onCancel: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_MAPPING: ColumnMapping = {
  ticker: "", name: "", marketValue: "", quantity: "",
  marketPrice: "", currency: "", accountType: "", assetType: "",
};

const inputClass =
  "w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white";
const labelClass = "block text-xs font-medium text-slate-500 mb-1";

const MAPPED_FIELDS: Array<{ key: keyof ColumnMapping; label: string; required: boolean }> = [
  { key: "ticker",      label: "Ticker / Symbol",    required: false },
  { key: "name",        label: "Name / Description",  required: false },
  { key: "marketValue", label: "Market Value",         required: true  },
  { key: "quantity",    label: "Quantity",             required: false },
  { key: "marketPrice", label: "Market Price",         required: false },
  { key: "currency",    label: "Currency",             required: false },
  { key: "accountType", label: "Account Type",         required: false },
  { key: "assetType",   label: "Asset Type",           required: false },
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
    const warnings: RowWarning[] = [];
    let hasCurrencyDefault = false;
    const existingTickers = new Set(existingHoldings.map((h) => h.ticker.toUpperCase()).filter(Boolean));
    let hasDuplicates = false;

    csvRows.forEach((row, i) => {
      const ticker = mapping.ticker ? (row[mapping.ticker] ?? "").trim().toUpperCase() : "";
      const name   = mapping.name   ? (row[mapping.name]   ?? "").trim()              : "";
      const display = ticker || name || `Row ${i + 1}`;

      if (!ticker && !name) {
        warnings.push({ rowIndex: i + 1, display: `Row ${i + 1}`, reason: "No ticker or name found — row skipped." });
        return;
      }

      const rawValue   = mapping.marketValue ? (row[mapping.marketValue] ?? "") : "";
      const marketValue = parseCurrencyValue(rawValue);
      if (!marketValue || marketValue <= 0) {
        warnings.push({ rowIndex: i + 1, display, reason: "No valid market value — row skipped." });
        return;
      }

      const quantity    = mapping.quantity    ? parseCurrencyValue(row[mapping.quantity]    ?? "") : null;
      const marketPrice = mapping.marketPrice ? parseCurrencyValue(row[mapping.marketPrice] ?? "") : null;

      // Currency
      let currency: Currency = "CAD";
      const rawCurrency = mapping.currency ? (row[mapping.currency] ?? "").trim().toUpperCase() : "";
      if (rawCurrency === "USD") {
        currency = "USD";
      } else if (rawCurrency === "CAD") {
        currency = "CAD";
      } else {
        // Try local metadata before defaulting
        let gotFromMeta = false;
        if (ticker) {
          const meta = getMetadata(normalizeTicker(ticker));
          if (meta) {
            const metaCurrencies = Object.keys(meta.currencyExposure ?? {});
            if (metaCurrencies.length === 1 && metaCurrencies[0] === "USD") {
              currency = "USD";
              gotFromMeta = true;
            } else if (metaCurrencies.length > 0) {
              gotFromMeta = true; // CAD stays, but we found metadata
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

    setResult({ imported: holdings.length, skipped: warnings.length, warnings, hasCurrencyDefault, hasDuplicates });
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

        {/* Short helper copy */}
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
                <li>Market Value</li>
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
                ["Ticker", "Symbol, Ticker, Ticker Symbol, Security, Instrument"],
                ["Name", "Name, Description, Security Name, Holding, Instrument Name"],
                ["Market Value", "Market Value, Value, Current Value, Amount, Total Value"],
                ["Quantity", "Quantity, Shares, Units"],
                ["Price", "Price, Market Price, Last Price, Current Price"],
                ["Currency", "Currency, Currency Code"],
                ["Account Type", "Account, Account Type, Account Name"],
                ["Asset Type", "Asset Type, Type, Category, Security Type"],
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

        {/* Upload CTA */}
        <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
        <Button onClick={() => fileInputRef.current?.click()}>Choose CSV file</Button>
        {parseError && <p className="text-xs text-rose-500 mt-3">{parseError}</p>}

        {/* Privacy + beginner note */}
        <div className="mt-4 space-y-1.5">
          <p className="text-xs text-slate-400">
            CSV files are parsed in your browser. The raw file is not stored.
          </p>
          <p className="text-xs text-slate-400">
            Not sure what to upload? Export your holdings or positions list from your brokerage
            if available.
          </p>
          <p className="text-xs text-slate-400">
            Educational only. Not financial advice.
          </p>
        </div>
      </Card>
    );
  }

  // ── Done ──────────────────────────────────────────────────────────────────────

  if (importState === "done" && result) {
    return (
      <Card>
        <p className="text-sm font-semibold text-slate-800 mb-2">
          {result.imported > 0
            ? `${result.imported} holding${result.imported === 1 ? "" : "s"} imported`
            : "No holdings imported"}
        </p>
        {result.skipped > 0 && (
          <p className="text-xs text-slate-500 mb-1.5">
            {result.skipped} row{result.skipped === 1 ? "" : "s"} skipped.
          </p>
        )}
        {result.hasCurrencyDefault && (
          <p className="text-xs text-amber-600 mb-1.5">
            Rows without a recognised currency were defaulted to CAD.
          </p>
        )}
        {result.hasDuplicates && (
          <p className="text-xs text-slate-500 mb-1.5">
            Some tickers already exist in your holdings. They were added as separate rows.
          </p>
        )}
        {result.warnings.length > 0 && (
          <div className="mt-3 space-y-1 border-t border-slate-100 pt-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
              Skipped rows
            </p>
            {result.warnings.map((w) => (
              <p key={w.rowIndex} className="text-xs text-slate-400">
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

  const canImport = Boolean(mapping.ticker || mapping.name) && Boolean(mapping.marketValue);
  const previewRows = csvRows.slice(0, 5);

  return (
    <div className="space-y-4">
      {/* Preview table */}
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
          At least one of Ticker or Name, plus Market Value, is required. Other fields improve accuracy.
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-4">
          {MAPPED_FIELDS.map(({ key, label, required }) => (
            <div key={key}>
              <label className={labelClass}>
                {label}
                {required && <span className="text-rose-400 ml-0.5">*</span>}
              </label>
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
                {mode === "add"
                  ? "Add to current holdings"
                  : "Replace current holdings"}
              </span>
            </label>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={handleImport} disabled={!canImport}>
          Import {csvRows.length} row{csvRows.length === 1 ? "" : "s"} →
        </Button>
        <Button variant="ghost" onClick={() => { reset(); onCancel(); }}>
          Cancel
        </Button>
      </div>
      {!canImport && (
        <p className="text-xs text-rose-500">
          Map at least one of Ticker or Name, and Market Value, before importing.
        </p>
      )}
    </div>
  );
}
