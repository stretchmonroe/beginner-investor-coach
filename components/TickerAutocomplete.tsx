"use client";

import { useState, useRef, useEffect } from "react";
import { searchMetadata } from "@/lib/portfolioMetadata";
import type { TickerMetadata } from "@/lib/portfolioMetadata";

interface Props {
  value: string;
  onChange: (value: string) => void;
  onSelect: (meta: TickerMetadata) => void;
  placeholder?: string;
  inputClassName?: string;
}

function primaryCurrencyLabel(meta: TickerMetadata): string {
  return (Object.keys(meta.currencyExposure)[0] as string) ?? "—";
}

export default function TickerAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "e.g. VFV",
  inputClassName,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const suggestions = value.trim().length >= 1 ? searchMetadata(value, 8) : [];
  const showNoMatch = value.trim().length >= 2 && suggestions.length === 0;
  const showDropdown = isOpen && (suggestions.length > 0 || showNoMatch);

  // Reset highlight when query changes
  useEffect(() => {
    setHighlightedIndex(0);
  }, [value]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(meta: TickerMetadata) {
    onSelect(meta);
    setIsOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (suggestions[highlightedIndex]) {
        handleSelect(suggestions[highlightedIndex]);
      }
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
        onFocus={() => { if (value.trim().length >= 1) setIsOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        spellCheck={false}
        className={inputClassName}
      />

      {showDropdown && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden max-h-72 overflow-y-auto">
          {suggestions.length > 0 ? (
            suggestions.map((meta, i) => (
              <button
                key={meta.ticker}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSelect(meta); }}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 last:border-b-0 transition-colors cursor-pointer ${
                  i === highlightedIndex ? "bg-blue-50" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-bold text-slate-800 shrink-0">{meta.ticker}</span>
                  <span className="text-sm text-slate-500 truncate">{meta.name}</span>
                </div>
                <p className="text-xs text-slate-400">
                  {meta.assetType} · {meta.category} · {primaryCurrencyLabel(meta)}
                </p>
              </button>
            ))
          ) : (
            <div className="px-4 py-3">
              <p className="text-xs text-slate-500">
                No local match found. You can still enter this holding manually.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
