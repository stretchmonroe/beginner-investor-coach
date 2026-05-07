export type AssetType = "Stock" | "ETF" | "Mutual Fund" | "Bond ETF" | "Cash" | "Other";
export type AccountType = "TFSA" | "RRSP" | "FHSA" | "Non-registered" | "RESP" | "Other" | "Unknown";
export type Currency = "CAD" | "USD";
export type InsightType = "concentration" | "diversification" | "cash" | "info";
export type InsightSeverity = "warning" | "caution" | "info";

export interface EvidenceSource {
  sourceType: "manually-entered";
  label: string;
  value: string;
  details?: string;
}

export interface PortfolioInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  evidence: EvidenceSource[];
}

export interface Holding {
  id: string;
  ticker: string;
  name: string;
  assetType: AssetType;
  quantity: number | null;
  marketPrice: number | null;
  marketValue: number;
  currency: Currency;
  accountType: AccountType;
  source: "manual";
  createdAt: string;
}

export interface PortfolioSnapshot {
  holdings: Holding[];
  totalValue: number;
  currency: Currency;
  createdAt: string;
}

export interface PortfolioContextHolding {
  ticker: string;
  name: string;
  assetType: string;
  marketValue: number;
  weight: number;
}

export interface PortfolioContext {
  totalValue?: number;
  currency?: string;
  holdings?: PortfolioContextHolding[];
  largestHolding?: { label: string; weight: number };
  top3Weight?: number;
  assetMix?: Array<{ assetType: string; weight: number }>;
  sectorExposure?: Array<{ label: string; weight: number }>;
  geographyExposure?: Array<{ label: string; weight: number }>;
  currencyExposure?: Array<{ label: string; weight: number }>;
  concentrationInsights?: Array<{ title: string; description: string }>;
  overlapInsights?: Array<{ title: string; description: string }>;
  themeInsights?: Array<{ title: string; description: string }>;
  reportName?: string;
  savedAt?: string;
}
