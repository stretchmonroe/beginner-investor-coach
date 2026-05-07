import { NextResponse } from "next/server";

interface FmpProfile {
  symbol?: string;
  companyName?: string;
  sector?: string;
  industry?: string;
  exchangeShortName?: string;
  currency?: string;
  country?: string;
}

function inferAssetType(name: string, sector: string): string {
  const n = name.toLowerCase();
  if (n.includes("etf") || n.includes("index fund") || n.includes("index etf")) return "ETF";
  if (n.includes("bond etf") || (sector.toLowerCase() === "fixed income")) return "Bond ETF";
  if (n.includes("mutual fund") || n.includes("fund")) return "Mutual Fund";
  return "Stock";
}

function inferGeography(country: string): Record<string, number> {
  const c = country?.toUpperCase() ?? "";
  if (c === "US" || c === "USA" || c === "UNITED STATES") return { "United States": 100 };
  if (c === "CA" || c === "CAN" || c === "CANADA") return { Canada: 100 };
  if (c) return { International: 100 };
  return {};
}

function inferCurrency(currency: string, country: string): Record<string, number> {
  const cur = currency?.toUpperCase() ?? "";
  const cou = country?.toUpperCase() ?? "";
  if (cur === "CAD" || cou === "CA" || cou === "CAN") return { CAD: 100 };
  if (cur === "USD") return { USD: 100 };
  if (cur) return { USD: 100 }; // default for foreign-listed
  return {};
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = (searchParams.get("ticker") ?? "").trim().toUpperCase();

  if (!ticker) {
    return NextResponse.json({ ticker, metadata: null });
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ticker, metadata: null });
  }

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/profile/${encodeURIComponent(ticker)}?apikey=${apiKey}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return NextResponse.json({ ticker, metadata: null });
    }

    const data: unknown = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ ticker, metadata: null });
    }

    const profile = data[0] as FmpProfile;
    if (!profile.symbol || !profile.companyName) {
      return NextResponse.json({ ticker, metadata: null });
    }

    const name = profile.companyName;
    const sector = profile.sector ?? "";
    const industry = profile.industry ?? "";
    const country = profile.country ?? "";
    const currency = profile.currency ?? "";

    const metadata = {
      ticker,
      name,
      assetType: inferAssetType(name, sector),
      category: industry || sector || "Individual stock",
      primarySector: sector || "Unknown",
      geographyExposure: inferGeography(country),
      currencyExposure: inferCurrency(currency, country),
      notes: `Data sourced from FMP company profile. Geography and currency based on simplified inference from country (${country || "unknown"}) and currency (${currency || "unknown"}).`,
      evidenceLabel: `${ticker} — ${name} (FMP enriched)`,
    };

    return NextResponse.json({ ticker, metadata });
  } catch {
    return NextResponse.json({ ticker, metadata: null });
  }
}
