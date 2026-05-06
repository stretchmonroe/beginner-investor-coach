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
