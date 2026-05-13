"use client";

import { useState, useEffect } from "react";
import Button from "@/components/ui/Button";
import { trackEvent } from "@/lib/analytics";

// ─── Step definitions ─────────────────────────────────────────────────────────

const STEPS = [
  {
    icon: "🔍",
    title: "Understand your portfolio in plain English",
    description:
      "Upload holdings or enter them manually to see concentration, overlap, sector exposure, geography exposure, and simplified portfolio insights.",
  },
  {
    icon: "📊",
    title: "See what you're really exposed to",
    description:
      "Broad ETFs, technology holdings, Canadian banks, and U.S. equities can overlap more than many beginner investors realize.",
  },
  {
    icon: "🪔",
    title: "Ask Lantern",
    description:
      "Get beginner-friendly explanations about your portfolio without trading jargon or buy/sell recommendations.",
  },
  {
    icon: "🚀",
    title: "Start with your portfolio or explore a sample",
    description: process.env.NEXT_PUBLIC_BETA_MODE === "true"
      ? "You're one of the first people trying this. All premium features are unlocked — your feedback helps shape what comes next."
      : "",
  },
] as const;

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onDismiss: () => void;
  onAddHoldings: () => void;
  onSamplePortfolio: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Onboarding({ open, onDismiss, onAddHoldings, onSamplePortfolio }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (open) trackEvent("onboarding_viewed");
  }, [open]);

  if (!open) return null;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  function handleDismiss() {
    trackEvent("onboarding_skipped", { step });
    setStep(0);
    onDismiss();
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 cursor-default border-0 w-full h-full"
        aria-label="Skip introduction"
        onClick={handleDismiss}
      />

      {/* Card */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full border border-slate-200 p-6 z-10">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-5 bg-blue-600"
                  : i < step
                  ? "w-1.5 bg-blue-300"
                  : "w-1.5 bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* Icon */}
        <div className="text-4xl text-center mb-4">{current.icon}</div>

        {/* Title */}
        <h2 className="text-lg font-semibold text-slate-900 text-center leading-snug mb-2">
          {current.title}
        </h2>

        {/* Description */}
        {current.description && (
          <p className="text-sm text-slate-500 text-center leading-relaxed mb-6">
            {current.description}
          </p>
        )}

        {/* Step 4 — action buttons */}
        {isLast ? (
          <div className="space-y-2.5 mt-4">
            <Button
              className="w-full"
              onClick={() => {
                trackEvent("onboarding_completed");
                setStep(0);
                onAddHoldings();
              }}
            >
              Add my holdings
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                trackEvent("onboarding_completed");
                setStep(0);
                onSamplePortfolio();
              }}
            >
              Try sample portfolio
            </Button>
            <p className="text-center text-xs text-slate-400 pt-1">
              Educational only · No account needed · Not financial advice
            </p>
          </div>
        ) : (
          /* Navigation row */
          <div className="flex items-center justify-between mt-4">
            {isFirst ? (
              <button
                onClick={handleDismiss}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                Skip
              </button>
            ) : (
              <button
                onClick={() => setStep((s) => s - 1)}
                className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                ← Back
              </button>
            )}
            <Button onClick={() => setStep((s) => s + 1)}>
              {step === STEPS.length - 2 ? "Get started →" : "Next →"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
