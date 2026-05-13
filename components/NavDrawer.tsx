"use client";

import { useEffect } from "react";
import type { User } from "@supabase/supabase-js";

interface Tool {
  label: string;
  action: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  user: User | null | undefined;
  onSignIn?: () => void;
  onSignOut?: () => void;
  tools: Tool[];
}

export default function NavDrawer({ open, onClose, user, onSignIn, onSignOut, tools }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <div className="relative bg-white w-72 max-w-[85vw] h-full shadow-xl flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <span className="text-sm font-semibold text-slate-700">Menu</span>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer text-lg leading-none"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Auth section */}
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Account
          </p>
          {user ? (
            <div className="space-y-1">
              <p className="text-xs text-slate-500 truncate">{user.email}</p>
              <button
                onClick={() => { onSignOut?.(); onClose(); }}
                className="text-sm font-medium text-slate-700 hover:text-rose-500 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              onClick={() => { onSignIn?.(); onClose(); }}
              className="text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Sign in to sync across devices
            </button>
          )}
        </div>

        {/* Tools list */}
        <div className="px-5 py-4 flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Tools
          </p>
          <div className="space-y-0.5">
            {tools.map((tool) => (
              <button
                key={tool.label}
                onClick={() => { tool.action(); onClose(); }}
                className="flex items-center justify-between w-full py-3 text-sm text-slate-700 hover:text-blue-600 transition-colors cursor-pointer text-left"
              >
                <span>{tool.label}</span>
                <span className="text-slate-300 text-xs">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
