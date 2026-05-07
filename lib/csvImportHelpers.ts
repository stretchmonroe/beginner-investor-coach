import type { Holding, AssetType, AccountType, Currency } from "@/types/portfolio";
import { getMetadata, normalizeTicker } from "@/lib/portfolioMetadata";

// ─── Column candidate arrays ──────────────────────────────────────────────────

export const TICKER_COLS = [
  "symbol", "ticker", "ticker symbol", "security", "instrument",
  "investment", "product symbol",
];
export const NAME_COLS = [
  "name", "description", "security name", "holding", "instrument name",
  "product name", "security description",
];
export const VALUE_COLS = [
  "market value", "current value", "market val", "value", "total value",
  "amount", "book value",
];
export const QTY_COLS = ["quantity", "shares", "units", "position", "qty"];
export const PRICE_COLS = [
  "market price", "last price", "current price", "unit price", "price",
];
export const CURRENCY_COLS = ["currency", "currency code", "curr"];
export const ACCOUNT_COLS = ["account type", "account name", "account number", "account"];
export const ASSET_COLS = [
  "asset type", "investment type", "security type", "type", "category",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ColumnMapping {
  ticker: string;
  name: string;
  marketValue: string;
  quantity: string;
  marketPrice: string;
  currency: string;
  accountType: string;
  assetType: string;
}

export interface RowWarning {
  rowIndex: number;
  display: string;
  reason: string;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  skippedWarnings: RowWarning[];
  importWarnings: RowWarning[];
  hasCurrencyDefault: boolean;
  hasDuplicates: boolean;
  unmappedCount: number;
}

export interface PreviewStats {
  ready: number;
  withWarnings: number;
  skipped: number;
  estimatedTotal: number;
  hasMixedCurrencies: boolean;
  hasDuplicates: boolean;
}

export interface MappingResult {
  holdings: Holding[];
  skippedWarnings: RowWarning[];
  importWarnings: RowWarning[];
  hasCurrencyDefault: boolean;
  hasDuplicates: boolean;
  unmappedCount: number;
}

export type ImportMode = "add" | "replace";

export const EMPTY_MAPPING: ColumnMapping = {
  ticker: "", name: "", marketValue: "", quantity: "",
  marketPrice: "", currency: "", accountType: "", assetType: "",
};

// ─── Column detection ─────────────────────────────────────────────────────────

export function detectColumn(headers: string[], candidates: string[]): string {
  const lower = headers.map((h) => h.toLowerCase().replace(/\s+/g, " ").trim());
  for (const c of candidates) {
    const i = lower.indexOf(c);
    if (i >= 0) return headers[i];
  }
  return "";
}

export function autoDetectColumns(headers: string[]): ColumnMapping {
  return {
    ticker:      detectColumn(headers, TICKER_COLS),
    name:        detectColumn(headers, NAME_COLS),
    marketValue: detectColumn(headers, VALUE_COLS),
    quantity:    detectColumn(headers, QTY_COLS),
    marketPrice: detectColumn(headers, PRICE_COLS),
    currency:    detectColumn(headers, CURRENCY_COLS),
    accountType: detectColumn(headers, ACCOUNT_COLS),
    assetType:   detectColumn(headers, ASSET_COLS),
  };
}

// ─── Value parsing ────────────────────────────────────────────────────────────

export function parseCurrencyValue(raw: string): number | null {
  if (!raw?.trim()) return null;
  let s = raw.trim();
  const isNegative = (s.startsWith("(") && s.endsWith(")")) || s.startsWith("-");
  s = s.replace(/^\(|\)$/g, "").replace(/^-/, "");
  s = s.replace(/^(CAD|USD)\s*/i, "").replace(/^C?\$\s*/, "");
  s = s.replace(/[$,\s]/g, "");
  if (!s) return null;
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return isNegative ? -n : n;
}

// ─── Asset type inference ─────────────────────────────────────────────────────

export function inferAssetType(ticker: string, name: string): AssetType {
  if (ticker) {
    const meta = getMetadata(normalizeTicker(ticker));
    if (meta) return meta.assetType;
  }
  const lower = name.toLowerCase();
  if (/\bbond\b/.test(lower) || /fixed income/.test(lower)) return "Bond ETF";
  if (/\betf\b/.test(lower)) return "ETF";
  if (/mutual fund/.test(lower)) return "Mutual Fund";
  if (/\bcash\b/.test(lower) || /hisa/.test(lower) || /money market/.test(lower) || /savings/.test(lower)) return "Cash";
  if (/\bfund\b/.test(lower)) return "ETF";
  return "Other";
}

// ─── Account type mapping ─────────────────────────────────────────────────────

export function mapAccountType(raw: string): AccountType {
  const s = raw.trim().toUpperCase();
  if (s.includes("TFSA")) return "TFSA";
  if (s.includes("RRSP")) return "RRSP";
  if (s.includes("FHSA")) return "FHSA";
  if (s.includes("RESP")) return "RESP";
  if (s.includes("NON") || s.includes("TAXABLE") || s.includes("MARGIN") || s.includes("CASH ACCOUNT")) return "Non-registered";
  return "Unknown";
}

// ─── Row-level helpers ────────────────────────────────────────────────────────

export function resolveMarketValue(
  row: Record<string, string>,
  mapping: ColumnMapping
): number | null {
  const direct = mapping.marketValue ? parseCurrencyValue(row[mapping.marketValue] ?? "") : null;
  if (direct !== null && direct > 0) return direct;
  if (mapping.quantity && mapping.marketPrice) {
    const qty   = parseCurrencyValue(row[mapping.quantity]    ?? "");
    const price = parseCurrencyValue(row[mapping.marketPrice] ?? "");
    if (qty !== null && qty > 0 && price !== null && price > 0) return qty * price;
  }
  return null;
}

// ─── Preview computation ──────────────────────────────────────────────────────

export function computePreview(
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

// ─── Row mapping ──────────────────────────────────────────────────────────────

export function mapCsvRowsToHoldings(
  rows: Record<string, string>[],
  mapping: ColumnMapping,
  importMode: ImportMode,
  existingHoldings: Holding[]
): MappingResult {
  const holdings: Holding[] = [];
  const skippedWarnings: RowWarning[] = [];
  const importWarnings: RowWarning[] = [];
  let hasCurrencyDefault = false;
  const existingTickers = new Set(existingHoldings.map((h) => h.ticker.toUpperCase()).filter(Boolean));
  let hasDuplicates = false;

  rows.forEach((row, i) => {
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

    const rawAccount = mapping.accountType ? (row[mapping.accountType] ?? "") : "";
    const accountType: AccountType = rawAccount.trim() ? mapAccountType(rawAccount) : "Unknown";

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

  return { holdings, skippedWarnings, importWarnings, hasCurrencyDefault, hasDuplicates, unmappedCount };
}
