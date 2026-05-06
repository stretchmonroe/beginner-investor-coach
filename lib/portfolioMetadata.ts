import type { Holding, PortfolioInsight, AssetType } from "@/types/portfolio";

// ─── Types ────────────────────────────────────────────────────────────────────

export type GeographyRegion = "Canada" | "United States" | "International";
export type CurrencyLabel = "CAD" | "USD" | "CAD-listed";

export interface TickerMetadata {
  ticker: string;
  name: string;
  assetType: AssetType;
  category: string;
  primarySector: string;
  geographyExposure: Partial<Record<GeographyRegion, number>>;
  currencyExposure: Partial<Record<CurrencyLabel, number>>;
  notes: string;
  evidenceLabel: string;
}

export interface ExposureItem {
  label: string;
  value: number;
  weight: number;
}

// ─── Disclaimer ───────────────────────────────────────────────────────────────

export const METADATA_DISCLAIMER =
  "Exposure estimates use simplified static mappings for education. Actual ETF holdings and weights can change.";

// ─── Static metadata ──────────────────────────────────────────────────────────

// Geography and currency percentages are approximate educational estimates.
// All geographyExposure values per ticker sum to 100.

const METADATA: Record<string, TickerMetadata> = {
  XEQT: {
    ticker: "XEQT",
    name: "iShares Core Equity ETF Portfolio",
    assetType: "ETF",
    category: "All-equity global ETF",
    primarySector: "Diversified",
    geographyExposure: { Canada: 25, "United States": 45, International: 30 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Broad all-equity ETF with global diversification. Exact holdings and weights change over time.",
    evidenceLabel: "XEQT — iShares Core Equity ETF Portfolio",
  },
  VEQT: {
    ticker: "VEQT",
    name: "Vanguard All-Equity ETF Portfolio",
    assetType: "ETF",
    category: "All-equity global ETF",
    primarySector: "Diversified",
    geographyExposure: { Canada: 30, "United States": 45, International: 25 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Broad all-equity ETF with global diversification. Exact holdings and weights change over time.",
    evidenceLabel: "VEQT — Vanguard All-Equity ETF Portfolio",
  },
  VGRO: {
    ticker: "VGRO",
    name: "Vanguard Growth ETF Portfolio",
    assetType: "ETF",
    category: "Growth allocation ETF (~80% equity, ~20% bonds)",
    primarySector: "Diversified",
    // ~80% equity (global, approx Canada 30 / US 40 / Intl 30) + ~20% Canadian bonds → blended:
    // Canada: (0.80 × 0.30) + 0.20 = 0.24 + 0.20 = 0.44 → 44%
    // US:     0.80 × 0.40 = 0.32 → 32%
    // Intl:   0.80 × 0.30 = 0.24 → 24%
    geographyExposure: { Canada: 44, "United States": 32, International: 24 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Approximately 80% global equity and 20% Canadian bonds. Geography estimates include the bond allocation.",
    evidenceLabel: "VGRO — Vanguard Growth ETF Portfolio",
  },
  VBAL: {
    ticker: "VBAL",
    name: "Vanguard Balanced ETF Portfolio",
    assetType: "ETF",
    category: "Balanced allocation ETF (~60% equity, ~40% bonds)",
    primarySector: "Diversified",
    // ~60% equity + ~40% Canadian bonds → blended:
    // Canada: (0.60 × 0.30) + 0.40 = 0.18 + 0.40 = 0.58 → 58%
    // US:     0.60 × 0.40 = 0.24 → 24%
    // Intl:   0.60 × 0.30 = 0.18 → 18%
    geographyExposure: { Canada: 58, "United States": 24, International: 18 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Approximately 60% global equity and 40% Canadian bonds. Geography estimates include the bond allocation.",
    evidenceLabel: "VBAL — Vanguard Balanced ETF Portfolio",
  },
  CASH: {
    ticker: "CASH",
    name: "Global X High Interest Savings ETF",
    assetType: "ETF",
    category: "Cash-equivalent ETF",
    primarySector: "Cash / Short-term",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "High-interest savings ETF. Returns tied to Canadian short-term interest rates.",
    evidenceLabel: "CASH — Global X High Interest Savings ETF",
  },
  VFV: {
    ticker: "VFV",
    name: "Vanguard S&P 500 Index ETF",
    assetType: "ETF",
    category: "U.S. large-cap equity ETF",
    primarySector: "Diversified",
    geographyExposure: { "United States": 100 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Tracks the S&P 500. Listed in CAD but holds USD-denominated assets. Currency risk is unhedged.",
    evidenceLabel: "VFV — Vanguard S&P 500 Index ETF",
  },
  XUU: {
    ticker: "XUU",
    name: "iShares Core S&P U.S. Total Market ETF",
    assetType: "ETF",
    category: "U.S. total market equity ETF",
    primarySector: "Diversified",
    geographyExposure: { "United States": 100 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Tracks the U.S. total stock market. Listed in CAD but holds USD-denominated assets.",
    evidenceLabel: "XUU — iShares Core S&P U.S. Total Market ETF",
  },
  VCN: {
    ticker: "VCN",
    name: "Vanguard FTSE Canada All Cap Index ETF",
    assetType: "ETF",
    category: "Canadian equity ETF",
    primarySector: "Diversified",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Broad Canadian equity ETF covering large, mid, and small-cap Canadian stocks.",
    evidenceLabel: "VCN — Vanguard FTSE Canada All Cap Index ETF",
  },
  VAB: {
    ticker: "VAB",
    name: "Vanguard Canadian Aggregate Bond Index ETF",
    assetType: "Bond ETF",
    category: "Canadian aggregate bond ETF",
    primarySector: "Fixed Income",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Broad Canadian bond ETF covering government and investment-grade corporate bonds.",
    evidenceLabel: "VAB — Vanguard Canadian Aggregate Bond Index ETF",
  },
  XBB: {
    ticker: "XBB",
    name: "iShares Core Canadian Universe Bond Index ETF",
    assetType: "Bond ETF",
    category: "Canadian aggregate bond ETF",
    primarySector: "Fixed Income",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Broad Canadian bond ETF. Often used as a core fixed-income holding.",
    evidenceLabel: "XBB — iShares Core Canadian Universe Bond Index ETF",
  },
  ZAG: {
    ticker: "ZAG",
    name: "BMO Aggregate Bond Index ETF",
    assetType: "Bond ETF",
    category: "Canadian aggregate bond ETF",
    primarySector: "Fixed Income",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Broad Canadian bond ETF from BMO. Tracks the FTSE Canada Universe Bond Index.",
    evidenceLabel: "ZAG — BMO Aggregate Bond Index ETF",
  },
  NVDA: {
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Technology",
    geographyExposure: { "United States": 100 },
    currencyExposure: { USD: 100 },
    notes: "U.S.-listed semiconductor and AI chip company. Traded in USD.",
    evidenceLabel: "NVDA — NVIDIA Corporation",
  },
  AAPL: {
    ticker: "AAPL",
    name: "Apple Inc.",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Technology",
    geographyExposure: { "United States": 100 },
    currencyExposure: { USD: 100 },
    notes: "U.S.-listed consumer technology company. Traded in USD.",
    evidenceLabel: "AAPL — Apple Inc.",
  },
  MSFT: {
    ticker: "MSFT",
    name: "Microsoft Corporation",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Technology",
    geographyExposure: { "United States": 100 },
    currencyExposure: { USD: 100 },
    notes: "U.S.-listed software and cloud company. Traded in USD.",
    evidenceLabel: "MSFT — Microsoft Corporation",
  },
  AMZN: {
    ticker: "AMZN",
    name: "Amazon.com Inc.",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Technology",
    geographyExposure: { "United States": 100 },
    currencyExposure: { USD: 100 },
    notes: "U.S.-listed e-commerce and cloud company. Traded in USD.",
    evidenceLabel: "AMZN — Amazon.com Inc.",
  },
  GOOGL: {
    ticker: "GOOGL",
    name: "Alphabet Inc. (Google)",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Technology",
    geographyExposure: { "United States": 100 },
    currencyExposure: { USD: 100 },
    notes: "U.S.-listed search and advertising company. Traded in USD.",
    evidenceLabel: "GOOGL — Alphabet Inc.",
  },
  META: {
    ticker: "META",
    name: "Meta Platforms Inc.",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Technology",
    geographyExposure: { "United States": 100 },
    currencyExposure: { USD: 100 },
    notes: "U.S.-listed social media company. Traded in USD.",
    evidenceLabel: "META — Meta Platforms Inc.",
  },
  TSLA: {
    ticker: "TSLA",
    name: "Tesla Inc.",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Technology",
    geographyExposure: { "United States": 100 },
    currencyExposure: { USD: 100 },
    notes: "U.S.-listed electric vehicle and energy company. Traded in USD.",
    evidenceLabel: "TSLA — Tesla Inc.",
  },
  SHOP: {
    ticker: "SHOP",
    name: "Shopify Inc.",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Technology",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Canadian-founded e-commerce company. Listed on TSX (CAD) and NYSE (USD). Assumes TSX listing.",
    evidenceLabel: "SHOP — Shopify Inc.",
  },
  RY: {
    ticker: "RY",
    name: "Royal Bank of Canada",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Financials",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Canadian bank listed on the TSX.",
    evidenceLabel: "RY — Royal Bank of Canada",
  },
  TD: {
    ticker: "TD",
    name: "Toronto-Dominion Bank",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Financials",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Canadian bank listed on the TSX.",
    evidenceLabel: "TD — Toronto-Dominion Bank",
  },
  ENB: {
    ticker: "ENB",
    name: "Enbridge Inc.",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Energy",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Canadian energy infrastructure company listed on the TSX.",
    evidenceLabel: "ENB — Enbridge Inc.",
  },
  BAM: {
    ticker: "BAM",
    name: "Brookfield Asset Management Ltd.",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Financials",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Canadian asset management company with global operations. Assumes TSX listing.",
    evidenceLabel: "BAM — Brookfield Asset Management Ltd.",
  },
};

// ─── Lookup ───────────────────────────────────────────────────────────────────

export function getMetadata(ticker: string): TickerMetadata | null {
  return METADATA[ticker.toUpperCase()] ?? null;
}

// ─── Exposure calculations ────────────────────────────────────────────────────

function p(n: number): string {
  return n.toFixed(1) + "%";
}

export function computeSectorExposure(holdings: Holding[], totalValue: number): ExposureItem[] {
  if (totalValue === 0) return [];
  const byLabel: Record<string, number> = {};
  for (const h of holdings) {
    const sector = getMetadata(h.ticker)?.primarySector ?? "Unknown";
    byLabel[sector] = (byLabel[sector] ?? 0) + h.marketValue;
  }
  return Object.entries(byLabel)
    .map(([label, value]) => ({ label, value, weight: (value / totalValue) * 100 }))
    .sort((a, b) => b.weight - a.weight);
}

export function computeGeographyExposure(holdings: Holding[], totalValue: number): ExposureItem[] {
  if (totalValue === 0) return [];
  const byLabel: Record<string, number> = {};
  for (const h of holdings) {
    const meta = getMetadata(h.ticker);
    if (meta) {
      for (const [region, regionPct] of Object.entries(meta.geographyExposure)) {
        if (regionPct === undefined) continue;
        byLabel[region] = (byLabel[region] ?? 0) + h.marketValue * regionPct / 100;
      }
    } else {
      byLabel["Unknown"] = (byLabel["Unknown"] ?? 0) + h.marketValue;
    }
  }
  return Object.entries(byLabel)
    .map(([label, value]) => ({ label, value, weight: (value / totalValue) * 100 }))
    .sort((a, b) => b.weight - a.weight);
}

export function computeCurrencyExposure(holdings: Holding[], totalValue: number): ExposureItem[] {
  if (totalValue === 0) return [];
  const byLabel: Record<string, number> = {};
  for (const h of holdings) {
    const meta = getMetadata(h.ticker);
    if (meta) {
      for (const [currency, currPct] of Object.entries(meta.currencyExposure)) {
        if (currPct === undefined) continue;
        byLabel[currency] = (byLabel[currency] ?? 0) + h.marketValue * currPct / 100;
      }
    } else {
      byLabel[h.currency] = (byLabel[h.currency] ?? 0) + h.marketValue;
    }
  }
  return Object.entries(byLabel)
    .map(([label, value]) => ({ label, value, weight: (value / totalValue) * 100 }))
    .sort((a, b) => b.weight - a.weight);
}

export function computeUnmappedWeight(holdings: Holding[], totalValue: number): number {
  if (totalValue === 0) return 0;
  const unmappedValue = holdings
    .filter((h) => !getMetadata(h.ticker))
    .reduce((s, h) => s + h.marketValue, 0);
  return (unmappedValue / totalValue) * 100;
}

export function hasUnmappedHoldings(holdings: Holding[]): boolean {
  return holdings.some((h) => !getMetadata(h.ticker));
}

// ─── Overlap insights ─────────────────────────────────────────────────────────

const BROAD_EQUITY_ETFS = new Set(["XEQT", "VEQT", "VGRO", "VBAL", "VFV", "XUU"]);
const MEGA_CAP_STOCKS = new Set(["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA"]);

export function computeOverlapInsights(holdings: Holding[]): PortfolioInsight[] {
  const insights: PortfolioInsight[] = [];
  const tickers = new Set(holdings.map((h) => h.ticker));

  // XEQT + VEQT both held
  if (tickers.has("XEQT") && tickers.has("VEQT")) {
    insights.push({
      id: "xeqt-veqt-overlap",
      type: "concentration",
      severity: "caution",
      title: "Potential overlap: XEQT and VEQT",
      description:
        "XEQT and VEQT may serve a similar all-equity portfolio role. Holding both may create overlap rather than meaningful diversification.",
      evidence: [
        { sourceType: "manually-entered", label: "Holdings", value: "XEQT and VEQT" },
        { sourceType: "manually-entered", label: "Category", value: "Both are all-equity global ETFs" },
        { sourceType: "manually-entered", label: "Source", value: "Static educational metadata" },
      ],
    });
  }

  // Broad equity ETF + mega-cap individual stocks
  const heldBroadETFs = [...tickers].filter((t) => BROAD_EQUITY_ETFS.has(t));
  const heldMegaCaps = [...tickers].filter((t) => MEGA_CAP_STOCKS.has(t));

  if (heldBroadETFs.length > 0 && heldMegaCaps.length > 0) {
    insights.push({
      id: "broad-etf-stock-overlap",
      type: "concentration",
      severity: "info",
      title: "Broad ETF and individual stock overlap",
      description:
        "Some individual stocks may already be represented inside broad ETFs. This can increase exposure to those companies or sectors beyond what the portfolio weight alone suggests.",
      evidence: [
        { sourceType: "manually-entered", label: "Broad ETF(s) held", value: heldBroadETFs.join(", ") },
        { sourceType: "manually-entered", label: "Individual stock(s) held", value: heldMegaCaps.join(", ") },
        { sourceType: "manually-entered", label: "Note", value: "Exact ETF holdings change over time." },
        { sourceType: "manually-entered", label: "Source", value: "Static educational metadata" },
      ],
    });
  }

  return insights;
}

// ─── Theme insights (sector / geography concentration) ────────────────────────

export function computeThemeInsights(
  sectorExposure: ExposureItem[],
  geographyExposure: ExposureItem[],
  unmappedWeightPct: number
): PortfolioInsight[] {
  const insights: PortfolioInsight[] = [];

  const techWeight = sectorExposure.find((s) => s.label === "Technology")?.weight ?? 0;
  const usWeight = geographyExposure.find((g) => g.label === "United States")?.weight ?? 0;
  const caWeight = geographyExposure.find((g) => g.label === "Canada")?.weight ?? 0;

  if (techWeight > 35) {
    insights.push({
      id: "high-tech-exposure",
      type: "concentration",
      severity: "caution",
      title: "High technology exposure",
      description:
        "Technology appears to make up a large share of the portfolio based on simplified sector mapping. This may increase sensitivity to technology-sector swings.",
      evidence: [
        { sourceType: "manually-entered", label: "Estimated technology exposure", value: p(techWeight) },
        { sourceType: "manually-entered", label: "Source", value: "Static educational metadata" },
        { sourceType: "manually-entered", label: "Note", value: "Based on simplified sector mapping" },
      ],
    });
  }

  if (usWeight > 70) {
    insights.push({
      id: "high-us-exposure",
      type: "concentration",
      severity: "info",
      title: "High U.S. exposure",
      description:
        "The portfolio appears heavily exposed to the United States based on simplified geography mapping.",
      evidence: [
        { sourceType: "manually-entered", label: "Estimated U.S. exposure", value: p(usWeight) },
        { sourceType: "manually-entered", label: "Source", value: "Static educational metadata" },
        { sourceType: "manually-entered", label: "Note", value: "Based on simplified geography mapping" },
      ],
    });
  }

  if (caWeight > 70) {
    insights.push({
      id: "high-canada-exposure",
      type: "concentration",
      severity: "info",
      title: "High Canada exposure",
      description:
        "The portfolio appears heavily exposed to Canada. This may create home-country concentration.",
      evidence: [
        { sourceType: "manually-entered", label: "Estimated Canada exposure", value: p(caWeight) },
        { sourceType: "manually-entered", label: "Source", value: "Static educational metadata" },
        { sourceType: "manually-entered", label: "Note", value: "Based on simplified geography mapping" },
      ],
    });
  }

  if (unmappedWeightPct > 25) {
    insights.push({
      id: "unmapped-holdings",
      type: "info",
      severity: "info",
      title: "Some holdings are not mapped yet",
      description:
        "Some holdings do not have static metadata yet, so exposure estimates may be incomplete.",
      evidence: [
        { sourceType: "manually-entered", label: "Unmapped portfolio weight", value: p(unmappedWeightPct) },
        { sourceType: "manually-entered", label: "Note", value: "Exposure estimates are based on mapped holdings only" },
      ],
    });
  }

  return insights;
}

// ─── Search ───────────────────────────────────────────────────────────────────

export function getAllMetadata(): TickerMetadata[] {
  return Object.values(METADATA);
}

export function searchMetadata(query: string, limit = 8): TickerMetadata[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return [];

  const tickerPrefix: TickerMetadata[] = [];
  const nameMatch: TickerMetadata[] = [];
  const categoryMatch: TickerMetadata[] = [];

  for (const meta of getAllMetadata()) {
    const tickerL = meta.ticker.toLowerCase();
    const nameL = meta.name.toLowerCase();
    const catL = meta.category.toLowerCase();
    const sectorL = meta.primarySector.toLowerCase();

    if (tickerL.startsWith(q)) {
      tickerPrefix.push(meta);
    } else if (nameL.includes(q)) {
      nameMatch.push(meta);
    } else if (catL.includes(q) || sectorL.includes(q)) {
      categoryMatch.push(meta);
    }
  }

  return [...tickerPrefix, ...nameMatch, ...categoryMatch].slice(0, limit);
}
