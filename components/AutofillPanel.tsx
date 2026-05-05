"use client";

import { useState } from "react";
import type { AutofillExtractedFields, AutofillResult } from "@/types/autofill";
import { formatCurrency } from "@/lib/formatters";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const EXAMPLES = [
  "I take home $7,000/month, spend $4,000 on bills, have $30,000 saved, want to protect $20,000, and can invest around $1,250/month.",
  "I have $15,000 to start and want to reach $500,000 in 20 years. I can contribute about $800/month.",
  "I want to reach $1M in 15 years but I'm not sure how much I can invest monthly.",
];

const MONEY_SNAPSHOT_LABELS: Partial<Record<keyof AutofillExtractedFields, string>> = {
  monthlyTakeHomePay: "Monthly take-home pay",
  monthlyBills: "Monthly bills",
  monthlyDebtPayments: "Monthly debt payments",
  currentCashSavings: "Current cash savings",
  emergencyFundTarget: "Emergency fund target",
  shortTermSavingsToProtect: "Short-term savings to protect",
  startingInvestmentAmount: "Starting investment amount",
  monthlyEmergencySavingsContribution: "Monthly emergency savings",
  monthlyShortTermSavingsContribution: "Monthly short-term savings",
  monthlyLifestylePlayBuffer: "Monthly lifestyle buffer",
  emergencyFundStatus: "Emergency fund status",
};

const GOAL_LABELS: Partial<Record<keyof AutofillExtractedFields, string>> = {
  targetAmount: "Target portfolio value",
  timelineYears: "Timeline",
  affordableMonthlyContribution: "Affordable monthly contribution",
  annualReturnAssumption: "Annual return assumption",
  investorProfile: "Investor profile",
};

const CURRENCY_FIELDS = new Set<keyof AutofillExtractedFields>([
  "monthlyTakeHomePay", "monthlyBills", "monthlyDebtPayments", "currentCashSavings",
  "emergencyFundTarget", "shortTermSavingsToProtect", "startingInvestmentAmount",
  "monthlyEmergencySavingsContribution", "monthlyShortTermSavingsContribution",
  "monthlyLifestylePlayBuffer", "targetAmount", "affordableMonthlyContribution",
]);

function formatFieldValue(key: keyof AutofillExtractedFields, value: number | string): string {
  if (CURRENCY_FIELDS.has(key) && typeof value === "number") return formatCurrency(value);
  if (key === "timelineYears") return `${value} years`;
  if (key === "annualReturnAssumption") return `${value}%`;
  return String(value);
}

interface Props {
  onApply: (fields: AutofillExtractedFields) => void;
  profile?: string;
}

type PanelState = "idle" | "loading" | "preview" | "error";

export default function AutofillPanel({ onApply, profile }: Props) {
  const [panelState, setPanelState] = useState<PanelState>("idle");
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<AutofillResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [justApplied, setJustApplied] = useState(false);

  async function handleAutofill() {
    if (!description.trim()) return;
    setPanelState("loading");
    setResult(null);
    setErrorMsg("");
    setJustApplied(false);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch("/api/readiness-autofill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim(), profile }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(err.error ?? "Request failed.");
      }

      const data = await res.json() as AutofillResult;

      if (data.status === "unsupported") {
        setErrorMsg(
          "This description doesn't seem to contain financial planning information. Try describing your income, savings, or goal."
        );
        setPanelState("error");
        return;
      }

      setResult(data);
      setPanelState("preview");
    } catch (e) {
      clearTimeout(timeout);
      const msg = e instanceof Error && e.name === "AbortError"
        ? "Autofill took too long. You can fill the fields manually or try a shorter description."
        : e instanceof Error
        ? e.message
        : "Autofill failed. You can fill the fields manually or try a shorter description.";
      setErrorMsg(msg);
      setPanelState("error");
    }
  }

  function handleApply() {
    if (!result) return;
    onApply(result.extractedFields);
    setJustApplied(true);
    setDescription("");
    setResult(null);
    setPanelState("idle");
  }

  function handleClear() {
    setDescription("");
    setResult(null);
    setErrorMsg("");
    setJustApplied(false);
    setPanelState("idle");
  }

  const fields = result?.extractedFields;
  const moneyEntries = fields
    ? (Object.keys(MONEY_SNAPSHOT_LABELS) as (keyof AutofillExtractedFields)[]).filter((k) => fields[k] != null)
    : [];
  const goalEntries = fields
    ? (Object.keys(GOAL_LABELS) as (keyof AutofillExtractedFields)[]).filter((k) => fields[k] != null)
    : [];
  const hasFields = moneyEntries.length > 0 || goalEntries.length > 0;

  return (
    <div className="mb-5">
      <Card padding="sm">
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-0.5">Autofill from a quick description</p>
            <p className="text-xs text-slate-400 leading-snug">
              Describe your income, savings, monthly expenses, and goal. The assistant will try to fill in the fields for you.
            </p>
          </div>

          {justApplied && panelState === "idle" && (
            <div className="flex items-center gap-2 text-xs text-teal-700 bg-teal-50 border border-teal-200 rounded-lg px-3 py-2">
              <span>✓</span>
              <span>Fields pre-filled from your description. You can adjust anything below.</span>
            </div>
          )}

          {panelState !== "preview" && (
            <>
              <textarea
                value={description}
                onChange={(e) => { setDescription(e.target.value); setJustApplied(false); }}
                placeholder='I take home $7,000/month, spend $4,000 on bills, have $30,000 saved, want to protect $15,000, and want to reach $1M in 15 years.'
                rows={3}
                maxLength={2000}
                disabled={panelState === "loading"}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:opacity-50"
              />

              <div className="flex flex-wrap gap-1.5">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => { setDescription(ex); setJustApplied(false); setPanelState("idle"); }}
                    disabled={panelState === "loading"}
                    className="text-xs text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-full cursor-pointer transition-colors disabled:opacity-50"
                  >
                    Example {i + 1}
                  </button>
                ))}
              </div>

              {panelState === "error" && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {errorMsg}
                </p>
              )}

              <div className="flex items-center gap-3">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleAutofill}
                  disabled={!description.trim() || panelState === "loading"}
                >
                  {panelState === "loading" ? "Extracting…" : "Autofill fields"}
                </Button>
                {(description.trim() || justApplied) && panelState !== "loading" && (
                  <button
                    onClick={handleClear}
                    className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <p className="text-xs text-slate-400">
                Autofill helps organize the numbers you provide. It does not provide financial advice.
              </p>
            </>
          )}

          {panelState === "preview" && result && (
            <div className="space-y-4">
              {/* Summary */}
              <p className="text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                {result.summary}
              </p>

              {/* Research-needed notice */}
              {result.researchNeeded.needed && (
                <div className="flex gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <span className="shrink-0 mt-0.5">⚠</span>
                  <span>
                    {result.researchNeeded.reason} This may require current information — the app can autofill your personal numbers, but verify this detail separately.
                  </span>
                </div>
              )}

              {/* Extracted fields */}
              {hasFields ? (
                <div className="space-y-3">
                  {moneyEntries.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                        Budget &amp; savings
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        {moneyEntries.map((k) => (
                          <div key={k}>
                            <span className="text-slate-400">{MONEY_SNAPSHOT_LABELS[k]}: </span>
                            <span className="font-semibold text-slate-700">
                              {formatFieldValue(k, fields![k] as number | string)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {goalEntries.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1.5">
                        Goal &amp; timeline
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                        {goalEntries.map((k) => (
                          <div key={k}>
                            <span className="text-slate-400">{GOAL_LABELS[k]}: </span>
                            <span className="font-semibold text-slate-700">
                              {formatFieldValue(k, fields![k] as number | string)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  No specific values could be extracted. Try adding numbers to your description.
                </p>
              )}

              {/* Assumptions */}
              {result.assumptions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
                    Assumptions
                  </p>
                  <ul className="space-y-0.5">
                    {result.assumptions.map((a, i) => (
                      <li key={i} className="text-xs text-slate-500">· {a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Clarifying questions */}
              {result.clarifyingQuestions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
                    Missing information
                  </p>
                  <ul className="space-y-0.5">
                    {result.clarifyingQuestions.map((q, i) => (
                      <li key={i} className="text-xs text-slate-600">· {q}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                {hasFields && (
                  <Button variant="primary" size="sm" onClick={handleApply}>
                    Apply fields
                  </Button>
                )}
                <button
                  onClick={() => setPanelState("idle")}
                  className="text-xs font-medium text-slate-500 hover:text-slate-700 cursor-pointer transition-colors"
                >
                  Edit description
                </button>
                <button
                  onClick={handleClear}
                  className="text-xs font-medium text-slate-400 hover:text-slate-600 cursor-pointer transition-colors"
                >
                  Clear
                </button>
              </div>

              <p className="text-xs text-slate-400">
                Autofill helps organize the numbers you provide. It does not provide financial advice.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
