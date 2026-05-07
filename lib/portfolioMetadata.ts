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

export type EnrichedMetadataMap = Record<string, TickerMetadata | null>;

// ─── Disclaimer ───────────────────────────────────────────────────────────────

export const METADATA_DISCLAIMER =
  "Exposure estimates use simplified static mappings for education. Actual holdings, weights, fees, and fund composition can change.";

// ─── Static metadata ──────────────────────────────────────────────────────────

// Geography and currency percentages are approximate educational estimates.
// All geographyExposure values per ticker sum to 100.

const METADATA: Record<string, TickerMetadata> = {
  // ── All-equity global ETFs ─────────────────────────────────────────────────
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

  // ── Growth allocation ETFs (~80% equity) ───────────────────────────────────
  VGRO: {
    ticker: "VGRO",
    name: "Vanguard Growth ETF Portfolio",
    assetType: "ETF",
    category: "Growth allocation ETF (~80% equity, ~20% bonds)",
    primarySector: "Diversified",
    // ~80% equity (Canada 30 / US 40 / Intl 30) + ~20% Canadian bonds → blended
    geographyExposure: { Canada: 44, "United States": 32, International: 24 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Approximately 80% global equity and 20% Canadian bonds. Geography estimates include the bond allocation.",
    evidenceLabel: "VGRO — Vanguard Growth ETF Portfolio",
  },
  XGRO: {
    ticker: "XGRO",
    name: "iShares Core Growth ETF Portfolio",
    assetType: "ETF",
    category: "Growth allocation ETF (~80% equity, ~20% bonds)",
    primarySector: "Diversified",
    // ~80% equity (Canada 25 / US 45 / Intl 30) + ~20% Canadian bonds → blended
    geographyExposure: { Canada: 40, "United States": 36, International: 24 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Approximately 80% global equity and 20% Canadian bonds. Geography estimates include the bond allocation.",
    evidenceLabel: "XGRO — iShares Core Growth ETF Portfolio",
  },

  // ── Balanced allocation ETFs (~60% equity) ─────────────────────────────────
  VBAL: {
    ticker: "VBAL",
    name: "Vanguard Balanced ETF Portfolio",
    assetType: "ETF",
    category: "Balanced allocation ETF (~60% equity, ~40% bonds)",
    primarySector: "Diversified",
    // ~60% equity (Canada 30 / US 40 / Intl 30) + ~40% Canadian bonds → blended
    geographyExposure: { Canada: 58, "United States": 24, International: 18 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Approximately 60% global equity and 40% Canadian bonds. Geography estimates include the bond allocation.",
    evidenceLabel: "VBAL — Vanguard Balanced ETF Portfolio",
  },
  XBAL: {
    ticker: "XBAL",
    name: "iShares Core Balanced ETF Portfolio",
    assetType: "ETF",
    category: "Balanced allocation ETF (~60% equity, ~40% bonds)",
    primarySector: "Diversified",
    // ~60% equity (Canada 25 / US 45 / Intl 30) + ~40% Canadian bonds → blended
    geographyExposure: { Canada: 55, "United States": 27, International: 18 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Approximately 60% global equity and 40% Canadian bonds. Geography estimates include the bond allocation.",
    evidenceLabel: "XBAL — iShares Core Balanced ETF Portfolio",
  },

  // ── Conservative / income allocation ETFs ─────────────────────────────────
  XINC: {
    ticker: "XINC",
    name: "iShares Core Income Balanced ETF Portfolio",
    assetType: "ETF",
    category: "Income allocation ETF (~40% equity, ~60% bonds)",
    primarySector: "Diversified",
    // ~40% equity (Canada 25 / US 45 / Intl 30) + ~60% Canadian bonds → blended
    geographyExposure: { Canada: 70, "United States": 18, International: 12 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Approximately 40% global equity and 60% Canadian bonds. More conservative than XBAL.",
    evidenceLabel: "XINC — iShares Core Income Balanced ETF Portfolio",
  },
  VCNS: {
    ticker: "VCNS",
    name: "Vanguard Conservative ETF Portfolio",
    assetType: "ETF",
    category: "Conservative allocation ETF (~40% equity, ~60% bonds)",
    primarySector: "Diversified",
    // ~40% equity (Canada 30 / US 40 / Intl 30) + ~60% Canadian bonds → blended
    geographyExposure: { Canada: 72, "United States": 16, International: 12 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Approximately 40% global equity and 60% Canadian bonds. Designed for more conservative investors.",
    evidenceLabel: "VCNS — Vanguard Conservative ETF Portfolio",
  },
  VCIP: {
    ticker: "VCIP",
    name: "Vanguard Conservative Income ETF Portfolio",
    assetType: "ETF",
    category: "Very conservative allocation ETF (~20% equity, ~80% bonds)",
    primarySector: "Diversified",
    // ~20% equity (Canada 30 / US 40 / Intl 30) + ~80% Canadian bonds → blended
    geographyExposure: { Canada: 86, "United States": 8, International: 6 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Approximately 20% global equity and 80% Canadian bonds. Highest bond allocation among Vanguard asset allocation ETFs.",
    evidenceLabel: "VCIP — Vanguard Conservative Income ETF Portfolio",
  },

  // ── Cash-equivalent ETFs ───────────────────────────────────────────────────
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

  // ── U.S. equity ETFs (S&P 500 and total market) ───────────────────────────
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
  ZSP: {
    ticker: "ZSP",
    name: "BMO S&P 500 Index ETF",
    assetType: "ETF",
    category: "U.S. large-cap equity ETF",
    primarySector: "Diversified",
    geographyExposure: { "United States": 100 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Tracks the S&P 500. Listed in CAD but holds USD-denominated assets. Currency risk is unhedged.",
    evidenceLabel: "ZSP — BMO S&P 500 Index ETF",
  },
  HXS: {
    ticker: "HXS",
    name: "Global X S&P 500 Index Corporate Class ETF",
    assetType: "ETF",
    category: "U.S. large-cap equity ETF (corporate class)",
    primarySector: "Diversified",
    geographyExposure: { "United States": 100 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Tracks the S&P 500 via a corporate class structure for potential tax efficiency. Listed in CAD.",
    evidenceLabel: "HXS — Global X S&P 500 Index Corporate Class ETF",
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

  // ── NASDAQ / technology ETFs ───────────────────────────────────────────────
  QQC: {
    ticker: "QQC",
    name: "Invesco NASDAQ 100 Index ETF",
    assetType: "ETF",
    category: "NASDAQ-100 equity ETF",
    primarySector: "Technology",
    geographyExposure: { "United States": 95, International: 5 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Tracks the NASDAQ-100 Index. Heavily concentrated in U.S. mega-cap technology companies. Listed in CAD.",
    evidenceLabel: "QQC — Invesco NASDAQ 100 Index ETF",
  },
  XQQ: {
    ticker: "XQQ",
    name: "iShares NASDAQ 100 Index ETF",
    assetType: "ETF",
    category: "NASDAQ-100 equity ETF",
    primarySector: "Technology",
    geographyExposure: { "United States": 95, International: 5 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Tracks the NASDAQ-100 Index. Heavily concentrated in U.S. mega-cap technology companies. Listed in CAD.",
    evidenceLabel: "XQQ — iShares NASDAQ 100 Index ETF",
  },
  HXQ: {
    ticker: "HXQ",
    name: "Global X NASDAQ-100 Index Corporate Class ETF",
    assetType: "ETF",
    category: "NASDAQ-100 equity ETF (corporate class)",
    primarySector: "Technology",
    geographyExposure: { "United States": 95, International: 5 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Tracks the NASDAQ-100 via a corporate class structure. Heavily technology-focused. Listed in CAD.",
    evidenceLabel: "HXQ — Global X NASDAQ-100 Index Corporate Class ETF",
  },
  TEC: {
    ticker: "TEC",
    name: "TD Global Technology Leaders Index ETF",
    assetType: "ETF",
    category: "Global technology equity ETF",
    primarySector: "Technology",
    geographyExposure: { "United States": 75, International: 25 },
    currencyExposure: { "CAD-listed": 100 },
    notes: "Tracks global technology leaders. Primarily U.S. mega-cap tech, with some international exposure. Listed in CAD.",
    evidenceLabel: "TEC — TD Global Technology Leaders Index ETF",
  },

  // ── Canadian equity ETFs ───────────────────────────────────────────────────
  XIU: {
    ticker: "XIU",
    name: "iShares S&P/TSX 60 Index ETF",
    assetType: "ETF",
    category: "Canadian large-cap equity ETF",
    primarySector: "Diversified",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Tracks the top 60 Canadian companies by market cap. Concentrated in financials and energy sectors.",
    evidenceLabel: "XIU — iShares S&P/TSX 60 Index ETF",
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

  // ── Canadian bond ETFs ─────────────────────────────────────────────────────
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

  // ── U.S. technology stocks ─────────────────────────────────────────────────
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
    name: "Alphabet Inc. (Class A)",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Technology",
    geographyExposure: { "United States": 100 },
    currencyExposure: { USD: 100 },
    notes: "U.S.-listed search and advertising company. Class A shares with voting rights. Traded in USD.",
    evidenceLabel: "GOOGL — Alphabet Inc.",
  },
  GOOG: {
    ticker: "GOOG",
    name: "Alphabet Inc. (Class C)",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Technology",
    geographyExposure: { "United States": 100 },
    currencyExposure: { USD: 100 },
    notes: "Class C shares of Alphabet Inc. (same company as GOOGL). No voting rights. Traded in USD.",
    evidenceLabel: "GOOG — Alphabet Inc. (Class C)",
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
  AMD: {
    ticker: "AMD",
    name: "Advanced Micro Devices Inc.",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Technology",
    geographyExposure: { "United States": 100 },
    currencyExposure: { USD: 100 },
    notes: "U.S.-listed semiconductor company (CPUs, GPUs). Traded in USD on NASDAQ.",
    evidenceLabel: "AMD — Advanced Micro Devices Inc.",
  },
  PLTR: {
    ticker: "PLTR",
    name: "Palantir Technologies Inc.",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Technology",
    geographyExposure: { "United States": 100 },
    currencyExposure: { USD: 100 },
    notes: "U.S.-listed data analytics and AI software company. Traded in USD on NYSE.",
    evidenceLabel: "PLTR — Palantir Technologies Inc.",
  },
  ARM: {
    ticker: "ARM",
    name: "Arm Holdings plc",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Technology",
    geographyExposure: { International: 100 },
    currencyExposure: { USD: 100 },
    notes: "UK-based chip architecture company listed on NASDAQ. Revenue is global. Traded in USD.",
    evidenceLabel: "ARM — Arm Holdings plc",
  },

  // ── U.S. consumer / financial stocks ──────────────────────────────────────
  COST: {
    ticker: "COST",
    name: "Costco Wholesale Corporation",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Consumer Staples",
    geographyExposure: { "United States": 100 },
    currencyExposure: { USD: 100 },
    notes: "U.S.-listed wholesale retail company with global operations. Traded in USD on NASDAQ.",
    evidenceLabel: "COST — Costco Wholesale Corporation",
  },
  "BRK.B": {
    ticker: "BRK.B",
    name: "Berkshire Hathaway Inc. (Class B)",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Financials",
    geographyExposure: { "United States": 100 },
    currencyExposure: { USD: 100 },
    notes: "U.S.-listed diversified holding company. Class B shares. Traded in USD on NYSE.",
    evidenceLabel: "BRK.B — Berkshire Hathaway Inc.",
  },
  DIS: {
    ticker: "DIS",
    name: "The Walt Disney Company",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Communication Services",
    geographyExposure: { "United States": 100 },
    currencyExposure: { USD: 100 },
    notes: "U.S.-listed media and entertainment company. Traded in USD on NYSE.",
    evidenceLabel: "DIS — The Walt Disney Company",
  },
  MA: {
    ticker: "MA",
    name: "Mastercard Incorporated",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Financials",
    geographyExposure: { "United States": 100 },
    currencyExposure: { USD: 100 },
    notes: "U.S.-listed global payments network. Traded in USD on NYSE.",
    evidenceLabel: "MA — Mastercard Incorporated",
  },
  V: {
    ticker: "V",
    name: "Visa Inc.",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Financials",
    geographyExposure: { "United States": 100 },
    currencyExposure: { USD: 100 },
    notes: "U.S.-listed global payments network. Traded in USD on NYSE.",
    evidenceLabel: "V — Visa Inc.",
  },

  // ── Canadian individual stocks ─────────────────────────────────────────────
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
  // Canadian banks
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
  BNS: {
    ticker: "BNS",
    name: "Bank of Nova Scotia",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Financials",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Canadian bank (Scotiabank) listed on the TSX. Has significant international operations.",
    evidenceLabel: "BNS — Bank of Nova Scotia",
  },
  BMO: {
    ticker: "BMO",
    name: "Bank of Montreal",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Financials",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Canadian bank listed on the TSX.",
    evidenceLabel: "BMO — Bank of Montreal",
  },
  CM: {
    ticker: "CM",
    name: "Canadian Imperial Bank of Commerce",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Financials",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Canadian bank (CIBC) listed on the TSX.",
    evidenceLabel: "CM — Canadian Imperial Bank of Commerce",
  },
  NA: {
    ticker: "NA",
    name: "National Bank of Canada",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Financials",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Canadian bank listed on the TSX. Largest bank primarily focused on Quebec.",
    evidenceLabel: "NA — National Bank of Canada",
  },
  // Canadian industrials / energy
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
  CNR: {
    ticker: "CNR",
    name: "Canadian National Railway Company",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Industrials",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Canadian railway company listed on the TSX. Operates across Canada and into the U.S.",
    evidenceLabel: "CNR — Canadian National Railway Company",
  },
  CP: {
    ticker: "CP",
    name: "Canadian Pacific Kansas City Limited",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Industrials",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Canadian railway company listed on the TSX. Operates across Canada, the U.S., and Mexico.",
    evidenceLabel: "CP — Canadian Pacific Kansas City Limited",
  },
  CNQ: {
    ticker: "CNQ",
    name: "Canadian Natural Resources Limited",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Energy",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Canadian oil and natural gas company listed on the TSX.",
    evidenceLabel: "CNQ — Canadian Natural Resources Limited",
  },
  // Canadian telecom
  BCE: {
    ticker: "BCE",
    name: "BCE Inc.",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Communication Services",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Canadian telecommunications company (Bell Canada) listed on the TSX.",
    evidenceLabel: "BCE — BCE Inc.",
  },
  T: {
    ticker: "T",
    name: "TELUS Corporation",
    assetType: "Stock",
    category: "Individual stock",
    primarySector: "Communication Services",
    geographyExposure: { Canada: 100 },
    currencyExposure: { CAD: 100 },
    notes: "Canadian telecommunications company listed on the TSX.",
    evidenceLabel: "T — TELUS Corporation",
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

// Strip exchange suffixes (.TO, .V, .CN, .NE) so "XEQT.TO" resolves to XEQT metadata.
export function normalizeTicker(ticker: string): string {
  return ticker.toUpperCase().replace(/\.(TO|V|CN|NE)$/, "");
}

export function getMetadata(ticker: string): TickerMetadata | null {
  return METADATA[normalizeTicker(ticker)] ?? null;
}

// ─── Exposure calculations ────────────────────────────────────────────────────

function p(n: number): string {
  return n.toFixed(1) + "%";
}

function effectiveMeta(ticker: string, enriched: EnrichedMetadataMap): TickerMetadata | null {
  return getMetadata(ticker) ?? enriched[normalizeTicker(ticker)] ?? null;
}

export function computeSectorExposure(
  holdings: Holding[],
  totalValue: number,
  enriched: EnrichedMetadataMap = {}
): ExposureItem[] {
  if (totalValue === 0) return [];
  const byLabel: Record<string, number> = {};
  for (const h of holdings) {
    const sector = effectiveMeta(h.ticker, enriched)?.primarySector ?? "Unknown";
    byLabel[sector] = (byLabel[sector] ?? 0) + h.marketValue;
  }
  return Object.entries(byLabel)
    .map(([label, value]) => ({ label, value, weight: (value / totalValue) * 100 }))
    .sort((a, b) => b.weight - a.weight);
}

export function computeGeographyExposure(
  holdings: Holding[],
  totalValue: number,
  enriched: EnrichedMetadataMap = {}
): ExposureItem[] {
  if (totalValue === 0) return [];
  const byLabel: Record<string, number> = {};
  for (const h of holdings) {
    const meta = effectiveMeta(h.ticker, enriched);
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

export function computeCurrencyExposure(
  holdings: Holding[],
  totalValue: number,
  enriched: EnrichedMetadataMap = {}
): ExposureItem[] {
  if (totalValue === 0) return [];
  const byLabel: Record<string, number> = {};
  for (const h of holdings) {
    const meta = effectiveMeta(h.ticker, enriched);
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

export function computeUnmappedWeight(
  holdings: Holding[],
  totalValue: number,
  enriched: EnrichedMetadataMap = {}
): number {
  if (totalValue === 0) return 0;
  const unmappedValue = holdings
    .filter((h) => !effectiveMeta(h.ticker, enriched))
    .reduce((s, h) => s + h.marketValue, 0);
  return (unmappedValue / totalValue) * 100;
}

export function hasUnmappedHoldings(
  holdings: Holding[],
  enriched: EnrichedMetadataMap = {}
): boolean {
  return holdings.some((h) => !effectiveMeta(h.ticker, enriched));
}

// ─── Overlap detection ────────────────────────────────────────────────────────

const SP500_ETFS = new Set(["VFV", "ZSP", "HXS", "XUU"]);
const GLOBAL_EQUITY_ETFS = new Set(["XEQT", "VEQT", "VGRO", "XGRO", "VBAL", "XBAL"]);
const NASDAQ_ETFS = new Set(["TEC", "XQQ", "QQC", "HXQ"]);
const MEGA_CAP_STOCKS = new Set(["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "GOOG", "META", "TSLA", "ARM", "AMD", "PLTR"]);
const CANADIAN_BANKS = new Set(["RY", "TD", "BNS", "BMO", "CM", "NA"]);

export function computeOverlapInsights(holdings: Holding[]): PortfolioInsight[] {
  const insights: PortfolioInsight[] = [];
  const tickers = new Set(holdings.map((h) => normalizeTicker(h.ticker)));

  // A. Similar all-equity ETFs: XEQT + VEQT
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
        { sourceType: "manually-entered", label: "Source", value: "Static educational mapping" },
      ],
    });
  }

  // B1. Similar growth ETFs: VGRO + XGRO
  if (tickers.has("VGRO") && tickers.has("XGRO")) {
    insights.push({
      id: "vgro-xgro-overlap",
      type: "concentration",
      severity: "caution",
      title: "Potential overlap: VGRO and XGRO",
      description:
        "VGRO and XGRO may serve a similar growth portfolio role (~80% equity, ~20% bonds). Holding both may create overlap rather than meaningful diversification.",
      evidence: [
        { sourceType: "manually-entered", label: "Holdings", value: "VGRO and XGRO" },
        { sourceType: "manually-entered", label: "Category", value: "Both are growth allocation ETFs (~80/20)" },
        { sourceType: "manually-entered", label: "Source", value: "Static educational mapping" },
      ],
    });
  }

  // B2. Similar balanced ETFs: VBAL + XBAL
  if (tickers.has("VBAL") && tickers.has("XBAL")) {
    insights.push({
      id: "vbal-xbal-overlap",
      type: "concentration",
      severity: "caution",
      title: "Potential overlap: VBAL and XBAL",
      description:
        "VBAL and XBAL may serve a similar balanced portfolio role (~60% equity, ~40% bonds). Holding both may create overlap rather than meaningful diversification.",
      evidence: [
        { sourceType: "manually-entered", label: "Holdings", value: "VBAL and XBAL" },
        { sourceType: "manually-entered", label: "Category", value: "Both are balanced allocation ETFs (~60/40)" },
        { sourceType: "manually-entered", label: "Source", value: "Static educational mapping" },
      ],
    });
  }

  // C. S&P 500 / U.S. broad-market overlap with global equity ETFs
  const heldSP500 = [...tickers].filter((t) => SP500_ETFS.has(t));
  const heldGlobal = [...tickers].filter((t) => GLOBAL_EQUITY_ETFS.has(t));
  if (heldSP500.length > 0 && heldGlobal.length > 0) {
    insights.push({
      id: "sp500-global-overlap",
      type: "concentration",
      severity: "info",
      title: "Potential U.S. equity overlap",
      description:
        "Some broad U.S. or global ETFs you hold may overlap in underlying U.S. equity exposure. Global equity ETFs like XEQT or VEQT already include significant U.S. market exposure, so a dedicated S&P 500 ETF alongside them may concentrate U.S. allocation further.",
      evidence: [
        { sourceType: "manually-entered", label: "S&P 500 / U.S. market ETF(s)", value: heldSP500.join(", ") },
        { sourceType: "manually-entered", label: "Global equity ETF(s)", value: heldGlobal.join(", ") },
        { sourceType: "manually-entered", label: "Note", value: "Based on simplified overlap rules" },
        { sourceType: "manually-entered", label: "Source", value: "Static educational mapping" },
      ],
    });
  }

  // D. NASDAQ / technology concentration
  const heldNasdaqETFs = [...tickers].filter((t) => NASDAQ_ETFS.has(t));
  const heldMegaCaps = [...tickers].filter((t) => MEGA_CAP_STOCKS.has(t));
  if (heldNasdaqETFs.length >= 2 || (heldNasdaqETFs.length > 0 && heldMegaCaps.length > 0)) {
    insights.push({
      id: "nasdaq-tech-overlap",
      type: "concentration",
      severity: "caution",
      title: "Technology and NASDAQ concentration",
      description:
        "Technology-focused ETFs and individual mega-cap technology stocks may share exposure to the same theme. This may increase concentration in the technology sector beyond what portfolio weights alone suggest.",
      evidence: [
        { sourceType: "manually-entered", label: "NASDAQ / tech ETF(s)", value: heldNasdaqETFs.length > 0 ? heldNasdaqETFs.join(", ") : "None" },
        { sourceType: "manually-entered", label: "Technology stock(s)", value: heldMegaCaps.length > 0 ? heldMegaCaps.join(", ") : "None" },
        { sourceType: "manually-entered", label: "Note", value: "Based on simplified overlap rules" },
        { sourceType: "manually-entered", label: "Source", value: "Static educational mapping" },
      ],
    });
  }

  // E. Canadian bank concentration
  const heldBanks = [...tickers].filter((t) => CANADIAN_BANKS.has(t));
  if (heldBanks.length >= 2) {
    insights.push({
      id: "canadian-bank-concentration",
      type: "concentration",
      severity: "caution",
      title: "Multiple Canadian bank holdings",
      description:
        "Multiple Canadian bank holdings may increase financial-sector and Canada-specific exposure. Canadian banks tend to move together during economic cycles.",
      evidence: [
        { sourceType: "manually-entered", label: "Canadian bank(s) held", value: heldBanks.join(", ") },
        { sourceType: "manually-entered", label: "Sector", value: "Financials (Canadian)" },
        { sourceType: "manually-entered", label: "Note", value: "Based on simplified overlap rules" },
        { sourceType: "manually-entered", label: "Source", value: "Static educational mapping" },
      ],
    });
  }

  // F. Individual mega-cap stocks inside broad ETFs
  const heldBroadETFs = [...tickers].filter((t) => SP500_ETFS.has(t) || GLOBAL_EQUITY_ETFS.has(t));
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
        { sourceType: "manually-entered", label: "Note", value: "Exact ETF holdings change over time. Based on simplified educational mapping." },
        { sourceType: "manually-entered", label: "Source", value: "Static educational mapping" },
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
  const q = query.trim().replace(/\.(TO|V|CN|NE)$/i, "").toLowerCase();
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
