import { NextResponse } from "next/server";
import { toProviderTicker, type MarketSnapshot } from "@/lib/marketData";

const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface CacheEntry {
  data: MarketSnapshot;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ticker = (searchParams.get("ticker") ?? "").trim().toUpperCase();

  if (!ticker) {
    return NextResponse.json({ error: "ticker is required." }, { status: 400 });
  }

  const cached = cache.get(ticker);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  const providerTicker = toProviderTicker(ticker);

  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${providerTicker}?interval=1d&range=5d`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
          Accept: "application/json",
        },
        next: { revalidate: 0 },
      }
    );

    if (!res.ok) {
      throw new Error(`Yahoo Finance responded with ${res.status}`);
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];

    if (!result) {
      throw new Error("No data returned from Yahoo Finance");
    }

    const meta = result.meta;
    const previousClose = meta.chartPreviousClose ?? meta.previousClose ?? null;
    const price = meta.regularMarketPrice ?? null;
    const change = price !== null && previousClose !== null ? price - previousClose : null;
    const changePercent = change !== null && previousClose ? (change / previousClose) * 100 : null;

    const snapshot: MarketSnapshot = {
      ticker,
      providerTicker,
      price,
      change,
      changePercent,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? null,
      currency: meta.currency ?? null,
      lastUpdated: new Date().toISOString(),
      source: "Yahoo Finance",
    };

    cache.set(ticker, { data: snapshot, expiresAt: Date.now() + CACHE_TTL_MS });
    return NextResponse.json(snapshot);
  } catch (err) {
    console.error("Market snapshot error:", err);
    return NextResponse.json(
      { error: "Could not fetch market data." },
      { status: 502 }
    );
  }
}
