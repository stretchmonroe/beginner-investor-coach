import { NextResponse } from "next/server";

interface FmpRaw {
  symbol: string;
  name: string;
  currency: string;
  stockExchange: string;
  exchangeShortName: string;
}

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string | null;
  currency: string | null;
  assetType: string | null;
  source: "fmp";
}

function inferAssetType(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("bond etf") || (n.includes("bond") && n.includes("etf"))) return "Bond ETF";
  if (n.includes(" etf") || n.endsWith("etf") || n.includes("index etf")) return "ETF";
  if (
    n.includes("portfolio") &&
    (n.includes("vanguard") || n.includes("ishares") || n.includes("bmo") || n.includes("blackrock"))
  )
    return "ETF";
  if (n.includes("fund") || n.includes("trust")) return "Mutual Fund";
  return "Stock";
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({ results: [] });
  }

  const apiKey = process.env.FMP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ results: [] });
  }

  try {
    const res = await fetch(
      `https://financialmodelingprep.com/api/v3/search?query=${encodeURIComponent(q)}&limit=10&apikey=${apiKey}`,
      { next: { revalidate: 0 } }
    );

    if (!res.ok) {
      return NextResponse.json({ results: [] });
    }

    const data: unknown = await res.json();

    if (!Array.isArray(data)) {
      return NextResponse.json({ results: [] });
    }

    const results: SearchResult[] = (data as FmpRaw[]).map((item) => ({
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchangeShortName || null,
      currency: item.currency || null,
      assetType: inferAssetType(item.name),
      source: "fmp",
    }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}
