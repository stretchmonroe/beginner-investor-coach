"use client";

import { useState, useEffect } from "react";
import type { MarketSnapshot } from "@/lib/marketData";

interface Props {
  ticker: string;
}

function fmt(n: number | null, decimals = 2): string {
  if (n === null) return "—";
  return n.toFixed(decimals);
}

export default function MarketSnapshot({ ticker }: Props) {
  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    setData(null);
    fetch(`/api/market-snapshot?ticker=${ticker}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) {
          setError(json.error);
        } else {
          setData(json as MarketSnapshot);
        }
      })
      .catch(() => setError("Could not load market data."))
      .finally(() => setLoading(false));
  }, [ticker]);

  const isPositive = data?.change !== null && (data?.change ?? 0) >= 0;
  const changeColor = isPositive ? "text-emerald-600" : "text-red-600";

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
        Market Snapshot
      </h3>

      {loading && (
        <div className="flex items-center gap-2 py-2">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-300 border-t-slate-500 animate-spin" />
          <span className="text-xs text-slate-400">Loading market data…</span>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-xs text-amber-700 leading-relaxed">
            Market data is unavailable right now. You can still use the educational ETF overview.
          </p>
        </div>
      )}

      {!loading && data && (
        <div className="bg-slate-50 rounded-xl px-4 py-4 space-y-3">
          {/* Price row */}
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-700">
                {data.price !== null ? `${data.currency ?? ""}${fmt(data.price)}` : "—"}
              </span>
              {data.currency && (
                <span className="text-xs text-slate-400">{data.currency}</span>
              )}
            </div>
            {data.change !== null && data.changePercent !== null && (
              <span className={`text-sm font-semibold ${changeColor}`}>
                {isPositive ? "+" : ""}{fmt(data.change)} ({isPositive ? "+" : ""}{fmt(data.changePercent)}%)
              </span>
            )}
          </div>

          {/* 52-week range */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-0.5">
              <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">52-wk High</p>
              <p className="text-slate-700 font-semibold">{fmt(data.fiftyTwoWeekHigh)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-slate-400 font-medium uppercase tracking-wide text-[10px]">52-wk Low</p>
              <p className="text-slate-700 font-semibold">{fmt(data.fiftyTwoWeekLow)}</p>
            </div>
          </div>

          {/* Footer */}
          <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-200 pt-2">
            Market data may be delayed. · Educational only. Not financial advice.
          </p>
        </div>
      )}
    </div>
  );
}
