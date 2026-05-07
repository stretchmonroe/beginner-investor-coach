import { describe, it, expect } from "vitest";
import Papa from "papaparse";
import {
  detectColumn,
  autoDetectColumns,
  parseCurrencyValue,
  resolveMarketValue,
  inferAssetType,
  mapAccountType,
  computePreview,
  mapCsvRowsToHoldings,
  TICKER_COLS,
  NAME_COLS,
  VALUE_COLS,
  QTY_COLS,
  PRICE_COLS,
  CURRENCY_COLS,
  type ColumnMapping,
} from "../csvImportHelpers";

// ─── CSV parsing helper ───────────────────────────────────────────────────────

function parseCSV(csv: string) {
  const result = Papa.parse<Record<string, string>>(csv.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim(),
  });
  return { headers: result.meta.fields ?? [], rows: result.data };
}

// ─── parseCurrencyValue ───────────────────────────────────────────────────────

describe("parseCurrencyValue", () => {
  it("parses plain numbers", () => {
    expect(parseCurrencyValue("10000")).toBe(10000);
    expect(parseCurrencyValue("5000.50")).toBe(5000.5);
  });

  it("strips dollar signs and commas", () => {
    expect(parseCurrencyValue("$10,000.50")).toBe(10000.5);
    expect(parseCurrencyValue("$2,500")).toBe(2500);
  });

  it("strips C$ prefix", () => {
    expect(parseCurrencyValue("C$8,500")).toBe(8500);
    expect(parseCurrencyValue("C$ 12000")).toBe(12000);
  });

  it("strips CAD and USD prefixes", () => {
    expect(parseCurrencyValue("CAD 10000")).toBe(10000);
    expect(parseCurrencyValue("USD 5000")).toBe(5000);
  });

  it("handles negative values in parentheses", () => {
    expect(parseCurrencyValue("(1500)")).toBe(-1500);
    expect(parseCurrencyValue("($2,000)")).toBe(-2000);
  });

  it("handles negative values with leading minus", () => {
    expect(parseCurrencyValue("-500")).toBe(-500);
    expect(parseCurrencyValue("-$1,200")).toBe(-1200);
  });

  it("returns null for empty or blank input", () => {
    expect(parseCurrencyValue("")).toBeNull();
    expect(parseCurrencyValue("   ")).toBeNull();
  });

  it("returns null for non-numeric input", () => {
    expect(parseCurrencyValue("abc")).toBeNull();
    expect(parseCurrencyValue("N/A")).toBeNull();
  });
});

// ─── detectColumn ─────────────────────────────────────────────────────────────

describe("detectColumn — ticker columns", () => {
  const cases = [
    "Symbol", "Ticker", "Ticker Symbol", "Security", "Instrument", "Product Symbol",
  ];
  for (const col of cases) {
    it(`detects "${col}"`, () => {
      expect(detectColumn([col], TICKER_COLS)).toBe(col);
    });
  }
});

describe("detectColumn — name columns", () => {
  const cases = [
    "Name", "Description", "Security Name", "Holding",
    "Instrument Name", "Product Name", "Security Description",
  ];
  for (const col of cases) {
    it(`detects "${col}"`, () => {
      expect(detectColumn([col], NAME_COLS)).toBe(col);
    });
  }
});

describe("detectColumn — market value columns", () => {
  const cases = [
    "Market Value", "Current Value", "Value", "Amount", "Total Value", "Market Val",
  ];
  for (const col of cases) {
    it(`detects "${col}"`, () => {
      expect(detectColumn([col], VALUE_COLS)).toBe(col);
    });
  }
});

describe("detectColumn — quantity columns", () => {
  const cases = ["Quantity", "Shares", "Units", "Position", "Qty"];
  for (const col of cases) {
    it(`detects "${col}"`, () => {
      expect(detectColumn([col], QTY_COLS)).toBe(col);
    });
  }
});

describe("detectColumn — price columns", () => {
  const cases = ["Price", "Market Price", "Last Price", "Current Price", "Unit Price"];
  for (const col of cases) {
    it(`detects "${col}"`, () => {
      expect(detectColumn([col], PRICE_COLS)).toBe(col);
    });
  }
});

describe("detectColumn — currency columns", () => {
  const cases = ["Currency", "Currency Code", "Curr"];
  for (const col of cases) {
    it(`detects "${col}"`, () => {
      expect(detectColumn([col], CURRENCY_COLS)).toBe(col);
    });
  }
});

describe("detectColumn — no match", () => {
  it("returns empty string when no candidate matches", () => {
    expect(detectColumn(["Unknown Column", "Blah"], TICKER_COLS)).toBe("");
  });
});

// ─── resolveMarketValue ───────────────────────────────────────────────────────

describe("resolveMarketValue", () => {
  const baseMapping: ColumnMapping = {
    ticker: "Ticker", name: "Name", marketValue: "Market Value",
    quantity: "Quantity", marketPrice: "Price",
    currency: "", accountType: "", assetType: "",
  };

  it("uses direct market value when present", () => {
    const row = { "Market Value": "5000", "Quantity": "10", "Price": "100" };
    expect(resolveMarketValue(row, baseMapping)).toBe(5000);
  });

  it("calculates qty × price when market value is absent", () => {
    const mapping = { ...baseMapping, marketValue: "" };
    const row = { "Quantity": "10", "Price": "500" };
    expect(resolveMarketValue(row, mapping)).toBe(5000);
  });

  it("prefers direct market value over qty × price fallback", () => {
    const row = { "Market Value": "9999", "Quantity": "10", "Price": "500" };
    expect(resolveMarketValue(row, baseMapping)).toBe(9999);
  });

  it("returns null when no value can be resolved", () => {
    const mapping = { ...baseMapping, marketValue: "", quantity: "", marketPrice: "" };
    const row = { "Ticker": "XEQT" };
    expect(resolveMarketValue(row, mapping)).toBeNull();
  });

  it("returns null when qty × price produces zero", () => {
    const mapping = { ...baseMapping, marketValue: "" };
    const row = { "Quantity": "0", "Price": "500" };
    expect(resolveMarketValue(row, mapping)).toBeNull();
  });
});

// ─── inferAssetType ───────────────────────────────────────────────────────────

describe("inferAssetType", () => {
  it("infers Bond ETF from name containing 'bond'", () => {
    expect(inferAssetType("", "Short-Term Bond Fund")).toBe("Bond ETF");
  });

  it("infers Bond ETF from name containing 'fixed income'", () => {
    expect(inferAssetType("", "Fixed Income Portfolio")).toBe("Bond ETF");
  });

  it("infers ETF from name containing 'etf'", () => {
    expect(inferAssetType("", "Global Equity ETF")).toBe("ETF");
  });

  it("infers Mutual Fund from name", () => {
    expect(inferAssetType("", "BMO Balanced Mutual Fund")).toBe("Mutual Fund");
  });

  it("infers Cash from name containing 'cash'", () => {
    expect(inferAssetType("", "Cash Holdings")).toBe("Cash");
  });

  it("infers Cash from name containing 'hisa'", () => {
    expect(inferAssetType("", "HISA Fund")).toBe("Cash");
  });

  it("returns Other for unrecognised names", () => {
    expect(inferAssetType("", "Some Unknown Corporation")).toBe("Other");
  });

  it("uses metadata when ticker is known (XEQT → ETF)", () => {
    expect(inferAssetType("XEQT", "")).toBe("ETF");
  });
});

// ─── mapAccountType ───────────────────────────────────────────────────────────

describe("mapAccountType", () => {
  it("detects TFSA", () => expect(mapAccountType("TFSA")).toBe("TFSA"));
  it("detects RRSP", () => expect(mapAccountType("My RRSP Account")).toBe("RRSP"));
  it("detects FHSA", () => expect(mapAccountType("FHSA")).toBe("FHSA"));
  it("detects RESP", () => expect(mapAccountType("RESP")).toBe("RESP"));
  it("detects Non-registered from 'Non-Registered'", () => expect(mapAccountType("Non-Registered")).toBe("Non-registered"));
  it("detects Non-registered from 'Taxable'", () => expect(mapAccountType("Taxable")).toBe("Non-registered"));
  it("detects Non-registered from 'Margin'", () => expect(mapAccountType("Margin Account")).toBe("Non-registered"));
  it("falls back to Unknown", () => expect(mapAccountType("Other Account")).toBe("Unknown"));
  it("returns Unknown for empty string", () => expect(mapAccountType("")).toBe("Unknown"));
});

// ─── Fixture test A: clean CSV ────────────────────────────────────────────────

describe("Fixture A — clean CSV with standard column names", () => {
  const csv = `
Symbol,Name,Market Value,Quantity,Price,Currency
XEQT,iShares Core Equity ETF Portfolio,10000,100,100,CAD
NVDA,NVIDIA Corporation,5000,10,500,USD
  `;

  it("auto-detects all columns correctly", () => {
    const { headers } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    expect(mapping.ticker).toBe("Symbol");
    expect(mapping.name).toBe("Name");
    expect(mapping.marketValue).toBe("Market Value");
    expect(mapping.quantity).toBe("Quantity");
    expect(mapping.marketPrice).toBe("Price");
    expect(mapping.currency).toBe("Currency");
  });

  it("imports 2 valid holdings with no warnings", () => {
    const { headers, rows } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    const { holdings, skippedWarnings, importWarnings } = mapCsvRowsToHoldings(rows, mapping, "add", []);
    expect(holdings).toHaveLength(2);
    expect(skippedWarnings).toHaveLength(0);
    expect(importWarnings).toHaveLength(0);
  });

  it("parses XEQT with correct ticker and market value", () => {
    const { headers, rows } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    const { holdings } = mapCsvRowsToHoldings(rows, mapping, "add", []);
    const xeqt = holdings.find((h) => h.ticker === "XEQT");
    expect(xeqt).toBeDefined();
    expect(xeqt!.marketValue).toBe(10000);
    expect(xeqt!.currency).toBe("CAD");
  });

  it("parses NVDA with USD currency", () => {
    const { headers, rows } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    const { holdings } = mapCsvRowsToHoldings(rows, mapping, "add", []);
    const nvda = holdings.find((h) => h.ticker === "NVDA");
    expect(nvda).toBeDefined();
    expect(nvda!.marketValue).toBe(5000);
    expect(nvda!.currency).toBe("USD");
  });

  it("normalises tickers to uppercase", () => {
    const csv2 = `Symbol,Name,Market Value\nxeqt,iShares Core Equity ETF Portfolio,10000`;
    const { headers, rows } = parseCSV(csv2);
    const mapping = autoDetectColumns(headers);
    const { holdings } = mapCsvRowsToHoldings(rows, mapping, "add", []);
    expect(holdings[0].ticker).toBe("XEQT");
  });
});

// ─── Fixture test B: dollar signs and commas ──────────────────────────────────

describe("Fixture B — dollar signs and commas in market value", () => {
  const csv = `
Symbol,Description,Market Value
XEQT,iShares Core Equity ETF Portfolio,"$10,000.50"
PLTR,Palantir Technologies Inc.,"$2,500"
  `;

  it("parses formatted currency values correctly", () => {
    const { headers, rows } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    const { holdings } = mapCsvRowsToHoldings(rows, mapping, "add", []);
    expect(holdings).toHaveLength(2);
    expect(holdings[0].marketValue).toBe(10000.5);
    expect(holdings[1].marketValue).toBe(2500);
  });
});

// ─── Fixture test C: qty × price fallback ─────────────────────────────────────

describe("Fixture C — quantity and price, no market value column", () => {
  const csv = `
Ticker,Name,Quantity,Market Price
NVDA,NVIDIA Corporation,10,500
  `;

  it("calculates market value as qty × price", () => {
    const { headers, rows } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    expect(mapping.marketValue).toBe("");
    expect(mapping.quantity).toBe("Quantity");
    expect(mapping.marketPrice).toBe("Market Price");
    const { holdings } = mapCsvRowsToHoldings(rows, mapping, "add", []);
    expect(holdings).toHaveLength(1);
    expect(holdings[0].marketValue).toBe(5000);
  });

  it("preview also computes estimated total from qty × price", () => {
    const { headers, rows } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    const preview = computePreview(rows, mapping, "add", []);
    expect(preview.ready).toBe(1);
    expect(preview.estimatedTotal).toBe(5000);
  });
});

// ─── Fixture test D: missing ticker, has name ─────────────────────────────────

describe("Fixture D — row with name but no ticker", () => {
  const csv = `
Name,Market Value
Unknown Fund,1500
  `;

  it("imports the row with a blank ticker and generates a warning", () => {
    const { headers, rows } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    const { holdings, importWarnings, skippedWarnings } = mapCsvRowsToHoldings(rows, mapping, "add", []);
    expect(holdings).toHaveLength(1);
    expect(holdings[0].ticker).toBe("");
    expect(holdings[0].marketValue).toBe(1500);
    expect(importWarnings).toHaveLength(1);
    expect(skippedWarnings).toHaveLength(0);
  });

  it("preview counts the row as withWarnings, not skipped", () => {
    const { headers, rows } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    const preview = computePreview(rows, mapping, "add", []);
    expect(preview.withWarnings).toBe(1);
    expect(preview.skipped).toBe(0);
    expect(preview.ready).toBe(0);
  });
});

// ─── Fixture test E: invalid row (all empty) ──────────────────────────────────

describe("Fixture E — row with no ticker, name, or value", () => {
  const csv = `
Symbol,Name,Market Value
XEQT,iShares Core Equity ETF Portfolio,10000
,,
  `;

  it("skips the empty row and generates a skipped warning", () => {
    const { headers, rows } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    const { holdings, skippedWarnings } = mapCsvRowsToHoldings(rows, mapping, "add", []);
    expect(holdings).toHaveLength(1);
    expect(skippedWarnings).toHaveLength(1);
  });

  it("preview counts the empty row as skipped", () => {
    const { headers, rows } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    const preview = computePreview(rows, mapping, "add", []);
    expect(preview.ready).toBe(1);
    expect(preview.skipped).toBe(1);
  });
});

// ─── Fixture test F: mixed currencies ─────────────────────────────────────────

describe("Fixture F — mixed CAD and USD currencies", () => {
  const csv = `
Symbol,Name,Market Value,Currency
XEQT,iShares Core Equity ETF Portfolio,10000,CAD
NVDA,NVIDIA Corporation,5000,USD
  `;

  it("flags hasMixedCurrencies in preview", () => {
    const { headers, rows } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    const preview = computePreview(rows, mapping, "add", []);
    expect(preview.hasMixedCurrencies).toBe(true);
  });

  it("imports both holdings without converting values", () => {
    const { headers, rows } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    const { holdings } = mapCsvRowsToHoldings(rows, mapping, "add", []);
    expect(holdings).toHaveLength(2);
    expect(holdings.find((h) => h.ticker === "XEQT")!.currency).toBe("CAD");
    expect(holdings.find((h) => h.ticker === "NVDA")!.currency).toBe("USD");
    expect(holdings.find((h) => h.ticker === "XEQT")!.marketValue).toBe(10000);
    expect(holdings.find((h) => h.ticker === "NVDA")!.marketValue).toBe(5000);
  });
});

// ─── Fixture test G: weird brokerage column names ─────────────────────────────

describe("Fixture G — non-standard brokerage column names", () => {
  const csv = `
Product Symbol,Security Description,Current Value,Units,Unit Price,Curr,Account Name
VFV,Vanguard S&P 500 Index ETF,12000,100,120,CAD,TFSA
  `;

  it("auto-detects all non-standard column names", () => {
    const { headers } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    expect(mapping.ticker).toBe("Product Symbol");
    expect(mapping.name).toBe("Security Description");
    expect(mapping.marketValue).toBe("Current Value");
    expect(mapping.quantity).toBe("Units");
    expect(mapping.marketPrice).toBe("Unit Price");
    expect(mapping.currency).toBe("Curr");
    expect(mapping.accountType).toBe("Account Name");
  });

  it("imports the holding correctly", () => {
    const { headers, rows } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    const { holdings, skippedWarnings } = mapCsvRowsToHoldings(rows, mapping, "add", []);
    expect(holdings).toHaveLength(1);
    expect(skippedWarnings).toHaveLength(0);
    expect(holdings[0].ticker).toBe("VFV");
    expect(holdings[0].marketValue).toBe(12000);
    expect(holdings[0].currency).toBe("CAD");
    expect(holdings[0].accountType).toBe("TFSA");
  });
});

// ─── Duplicate detection ──────────────────────────────────────────────────────

describe("computePreview — duplicate detection", () => {
  const csv = `
Symbol,Name,Market Value
XEQT,iShares Core Equity ETF Portfolio,10000
  `;

  it("flags hasDuplicates when ticker already in existing holdings (add mode)", () => {
    const { headers, rows } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    const existing = [
      { ticker: "XEQT", marketValue: 5000, id: "1", name: "", assetType: "ETF" as const,
        accountType: "TFSA" as const, currency: "CAD" as const, quantity: null,
        marketPrice: null, source: "manual" as const, createdAt: "" },
    ];
    const preview = computePreview(rows, mapping, "add", existing);
    expect(preview.hasDuplicates).toBe(true);
  });

  it("does not flag hasDuplicates in replace mode", () => {
    const { headers, rows } = parseCSV(csv);
    const mapping = autoDetectColumns(headers);
    const existing = [
      { ticker: "XEQT", marketValue: 5000, id: "1", name: "", assetType: "ETF" as const,
        accountType: "TFSA" as const, currency: "CAD" as const, quantity: null,
        marketPrice: null, source: "manual" as const, createdAt: "" },
    ];
    const preview = computePreview(rows, mapping, "replace", existing);
    expect(preview.hasDuplicates).toBe(false);
  });
});
