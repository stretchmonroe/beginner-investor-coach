import { supabase } from "./supabase";
import type { Etf } from "./etfs";

export async function fetchWatchlistTickers(sessionId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("anonymous_watchlist_items")
    .select("ticker")
    .eq("anonymous_session_id", sessionId);
  if (error) {
    console.error("Failed to fetch watchlist:", error.message);
    return [];
  }
  return data.map((row: { ticker: string }) => row.ticker);
}

export async function addWatchlistItem(sessionId: string, etf: Etf): Promise<void> {
  const { error } = await supabase.from("anonymous_watchlist_items").insert({
    anonymous_session_id: sessionId,
    ticker: etf.ticker,
    etf_name: etf.name,
    category: etf.category,
    risk_level: etf.riskLevel,
  });
  if (error) console.error("Failed to add to watchlist:", error.message);
}

export async function removeWatchlistItem(
  sessionId: string,
  ticker: string
): Promise<void> {
  const { error } = await supabase
    .from("anonymous_watchlist_items")
    .delete()
    .eq("anonymous_session_id", sessionId)
    .eq("ticker", ticker);
  if (error) console.error("Failed to remove from watchlist:", error.message);
}
