import type { Holding } from "@/types/portfolio";

// Intentionally designed to trigger:
//   • sp500-global-overlap (XEQT + VFV)
//   • nasdaq-tech-overlap (NVDA + broad ETFs)
//   • broad-etf-stock-overlap (NVDA inside XEQT/VFV)
//   • U.S. concentration theme
//   • mixed CAD/USD currencies
export const SAMPLE_HOLDINGS: Holding[] = [
  {
    id: "sample-xeqt",
    ticker: "XEQT",
    name: "iShares Core Equity ETF Portfolio",
    assetType: "ETF",
    accountType: "TFSA",
    currency: "CAD",
    quantity: 60,
    marketPrice: 33.0,
    marketValue: 1980.0,
    source: "manual",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-vfv",
    ticker: "VFV",
    name: "Vanguard S&P 500 Index ETF",
    assetType: "ETF",
    accountType: "TFSA",
    currency: "CAD",
    quantity: 20,
    marketPrice: 122.0,
    marketValue: 2440.0,
    source: "manual",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-nvda",
    ticker: "NVDA",
    name: "NVIDIA Corporation",
    assetType: "Stock",
    accountType: "Non-registered",
    currency: "USD",
    quantity: 5,
    marketPrice: 148.0,
    marketValue: 740.0,
    source: "manual",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-td",
    ticker: "TD",
    name: "Toronto-Dominion Bank",
    assetType: "Stock",
    accountType: "RRSP",
    currency: "CAD",
    quantity: 15,
    marketPrice: 84.0,
    marketValue: 1260.0,
    source: "manual",
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-cash",
    ticker: "CASH",
    name: "High-Interest Savings ETF",
    assetType: "Cash",
    accountType: "TFSA",
    currency: "CAD",
    quantity: null,
    marketPrice: null,
    marketValue: 500.0,
    source: "manual",
    createdAt: new Date().toISOString(),
  },
];
