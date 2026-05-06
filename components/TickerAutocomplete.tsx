"use client";

import { useState, useRef, useEffect } from "react";
import { searchMetadata } from "@/lib/portfolioMetadata";
import type { TickerMetadata } from "@/lib/portfolioMetadata";
import type { AssetType } from "@/types/portfolio";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AutocompleteSuggestion {
  ticker: string;
  name: string;
  assetType: AssetType | null;
  exchange: string | null;
  currency: string | null;
  source: "local" | "fmp";
}

interface FmpResult {
  symbol: string;
  name: string;
  exchange: string | null;
  currency: string | null;
  assetType: string | null;
  source: "fmp";
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AutocompleteSuggestion) => void;
  placeholder?: string;
  inputClassName?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EXCHANGE_SUFFIX_RE = /\.(TO|V|CN|NE)$/i;

function normalizeForDedup(ticker: string): string {
  return ticker.replace(EXCHANGE_SUFFIX_RE, "").toUpperCase();
}

function localToSuggestion(meta: TickerMetadata): AutocompleteSuggestion {
  const currencyKey = Object.keys(meta.currencyExposure)[0] ?? "CAD";
  const currency = currencyKey === "USD" ? "USD" : "CAD";
  return { ticker: meta.ticker, name: meta.name, assetType: meta.assetType, exchange: null, currency, source: "local" };
}

function fmpToSuggestion(r: FmpResult): AutocompleteSuggestion {
  return { ticker: r.symbol, name: r.name, assetType: r.assetType as AssetType | null, exchange: r.exchange, currency: r.currency, source: "fmp" };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TickerAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "e.g. VFV",
  inputClassName,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [fmpResults, setFmpResults] = useState<FmpResult[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Merge local + remote ──────────────────────────────────────────────────
  const trimmed = value.trim();
  const localSuggestions: AutocompleteSuggestion[] =
    trimmed.length >= 1 ? searchMetadata(trimmed, 6).map(localToSuggestion) : [];
  const localKeys = new Set(localSuggestions.map((s) => normalizeForDedup(s.ticker)));
  const remoteSuggestions: AutocompleteSuggestion[] = fmpResults
    .filter((r) => !localKeys.has(normalizeForDedup(r.symbol)))
    .slice(0, Math.max(0, 10 - localSuggestions.length))
    .map(fmpToSuggestion);
  const suggestions: AutocompleteSuggestion[] = [...localSuggestions, ...remoteSuggestions];

  const showNoMatch = trimmed.length >= 2 && suggestions.length === 0 && !remoteLoading;
  const showDropdown = isOpen && (suggestions.length > 0 || showNoMatch || (remoteLoading && trimmed.length >= 2));

  // ── Reset highlight when merged suggestions change ────────────────────────
  useEffect(() => {
    setHighlightedIndex(0);
  }, [value]);

  // ── Debounced remote search ───────────────────────────────────────────────
  useEffect(() => {
    const q = value.trim();
    if (q.length < 2) {
      setFmpResults([]);
      setRemoteLoading(false);
      return;
    }

    let cancelled = false;

    const timer = setTimeout(async () => {
      if (cancelled) return;
      setRemoteLoading(true);
      try {
        const res = await fetch(`/api/ticker-search?q=${encodeURIComponent(q)}`);
        if (!res.ok) throw new Error("Search failed");
        const data: { results: FmpResult[] } = await res.json();
        if (!cancelled) setFmpResults(data.results ?? []);
      } catch {
        if (!cancelled) setFmpResults([]);
      } finally {
        if (!cancelled) setRemoteLoading(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      setRemoteLoading(false);
    };
  }, [value]);

  // ── Close on outside click ────────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(suggestion: AutocompleteSuggestion) {
    onSelect(suggestion);
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[highlightedIndex]) handleSelect(suggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
        onFocus={() => { if (trimmed.length >= 1) setIsOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={inputClassName}
      />

      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={`${s.source}-${s.ticker}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
              className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-b-0 transition-colors cursor-pointer ${
                i === highlightedIndex ? "bg-blue-50" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-bold text-slate-800 shrink-0">{s.ticker}</span>
                <span className="text-sm text-slate-500 truncate">{s.name}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-400">
                {s.assetType && <span>{s.assetType}</span>}
                {s.exchange && <><span>·</span><span>{s.exchange}</span></>}
                {s.currency && <><span>·</span><span>{s.currency}</span></>}
                {s.source === "fmp" && (
                  <span className="ml-auto text-[10px] font-medium bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded-full">
                    Live
                  </span>
                )}
              </div>
            </button>
          ))}

          {remoteLoading && localSuggestions.length === 0 && (
            <div className="px-4 py-3">
              <p className="text-xs text-slate-400">Searching...</p>
            </div>
          )}

          {remoteLoading && localSuggestions.length > 0 && (
            <div className="px-4 py-2 border-t border-slate-50">
              <p className="text-xs text-slate-300">Searching for more...</p>
            </div>
          )}

          {showNoMatch && (
            <div className="px-4 py-3">
              <p className="text-xs text-slate-500">
                No match found. You can still enter this holding manually.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
