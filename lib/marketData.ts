export interface MarketSnapshot {
  ticker: string;
  providerTicker: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  fiftyTwoWeekHigh: number | null;
  fiftyTwoWeekLow: number | null;
  currency: string | null;
  lastUpdated: string;
  source: string;
}

const TICKER_MAP: Record<string, string> = {
  XEQT: "XEQT.TO",
  VEQT: "VEQT.TO",
  VGRO: "VGRO.TO",
  VBAL: "VBAL.TO",
  CASH: "CASH.TO",
};

export function toProviderTicker(ticker: string): string {
  return TICKER_MAP[ticker] ?? `${ticker}.TO`;
}
