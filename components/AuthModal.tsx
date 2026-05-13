"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import Button from "@/components/ui/Button";

type ModalState = "idle" | "sending" | "sent" | "error";

interface Props {
  open: boolean;
  onClose: () => void;
  message?: string;
}

export default function AuthModal({ open, onClose, message }: Props) {
  const { signInWithMagicLink } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<ModalState>("idle");
  const [errorText, setErrorText] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setState("idle");
      setEmail("");
      setErrorText("");
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || state === "sending") return;
    setState("sending");
    const { error } = await signInWithMagicLink(email.trim());
    if (error) {
      setErrorText(error);
      setState("error");
    } else {
      setState("sent");
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/40" aria-hidden />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none cursor-pointer"
          aria-label="Close"
        >
          ✕
        </button>

        <div className="mb-4">
          <p className="text-base font-semibold text-slate-800">Sign in to Lantern</p>
          {message && <p className="text-sm text-slate-500 mt-1">{message}</p>}
        </div>

        {state === "sent" ? (
          <div className="py-2">
            <p className="text-sm font-medium text-slate-800">Check your email</p>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">
              Click the link in your inbox to sign in. You can close this.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setState("idle");
                  setErrorText("");
                }}
                placeholder="you@example.com"
                autoFocus
                required
                className="w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              />
            </div>
            {state === "error" && (
              <p className="text-xs text-red-600">
                {errorText || "Something went wrong. Please try again."}
              </p>
            )}
            <Button type="submit" disabled={state === "sending" || !email.trim()} fullWidth>
              {state === "sending" ? "Sending…" : "Send sign-in link"}
            </Button>
          </form>
        )}

        <p className="text-xs text-slate-400 mt-4">
          We&apos;ll email you a secure link — no password needed.
        </p>
      </div>
    </div>
  );
}
