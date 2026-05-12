"use client";

import { useState, useEffect, useRef } from "react";
import type { QuizAnswers } from "./OnboardingQuiz";
import type { PortfolioContext } from "@/types/portfolio";
import { deriveProfile } from "@/lib/etfs";
import {
  saveCoachConversation,
  getCoachConversations,
  deleteCoachConversation,
  type CoachConversation,
} from "@/lib/coachHistory";
import PageLayout from "@/components/ui/PageLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Disclaimer from "@/components/ui/Disclaimer";

// ── Static prompts ────────────────────────────────────────────────────────────

const CONCEPT_PROMPTS = [
  "What is an ETF?",
  "What is diversification?",
  "What is a bond ETF?",
  "What does MER mean?",
  "What are broad-market ETFs?",
  "What is a mutual fund?",
];

const GENERIC_PORTFOLIO_PROMPTS = [
  "Explain my Portfolio X-Ray",
  "Am I concentrated in one holding?",
  "What does sector exposure mean?",
  "What does ETF overlap mean?",
  "What happens if my largest holding drops?",
  "How diversified is this portfolio?",
  "What are the biggest risks worth understanding here?",
  "What does currency exposure mean for a Canadian investor?",
];

// ── Context-aware prompt builder ──────────────────────────────────────────────

function buildPortfolioPrompts(ctx: PortfolioContext | undefined): string[] {
  if (!ctx || !ctx.holdings?.length) return GENERIC_PORTFOLIO_PROMPTS;

  const prompts: string[] = ["What stands out in this portfolio?"];

  if (ctx.largestHolding && ctx.largestHolding.weight > 20) {
    prompts.push(
      `Why does ${ctx.largestHolding.label} make up ${ctx.largestHolding.weight.toFixed(0)}% of the portfolio?`
    );
  } else {
    prompts.push("Am I concentrated in one holding?");
  }

  if (ctx.overlapInsights && ctx.overlapInsights.length > 0) {
    prompts.push("Why do these ETFs overlap?");
  }

  if (ctx.sectorExposure && ctx.sectorExposure.length > 0) {
    const top = ctx.sectorExposure[0];
    prompts.push(`What does ${top.weight.toFixed(0)}% ${top.label} exposure mean?`);
  } else {
    prompts.push("What does sector exposure mean?");
  }

  if (ctx.geographyExposure && ctx.geographyExposure.length > 0) {
    const topGeo = ctx.geographyExposure[0];
    if (topGeo.weight > 60) {
      prompts.push(`Why is the portfolio so concentrated in ${topGeo.label}?`);
    } else {
      prompts.push("What does my geography exposure mean?");
    }
  }

  if (ctx.hasMixedCurrencies) {
    prompts.push("What does holding both USD and CAD positions mean?");
  }

  if (ctx.unknownHoldingCount && ctx.unknownHoldingCount > 0) {
    prompts.push("Why couldn't some holdings be mapped?");
  }

  prompts.push("What happens if one holding drops sharply?");
  prompts.push("How diversified is this portfolio?");
  prompts.push("What are the biggest risks worth understanding here?");

  return prompts.slice(0, 9);
}

// ── Loading phases ────────────────────────────────────────────────────────────

const LOADING_PHASES = [
  "Preparing portfolio context…",
  "Analyzing exposures…",
  "Generating explanation…",
];

// ── Answer formatter ──────────────────────────────────────────────────────────

function formatAnswer(raw: string): React.ReactNode {
  const parts = raw.split(/\*\*(.+?)\*\*/g);
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 1) {
      nodes.push(
        <span key={i} className="font-semibold text-slate-800">
          {parts[i]}
        </span>
      );
    } else if (parts[i]) {
      nodes.push(<span key={i}>{parts[i]}</span>);
    }
  }
  return <>{nodes}</>;
}

// ── Evidence panel ────────────────────────────────────────────────────────────

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 text-xs">
      <span className="font-semibold text-slate-400 shrink-0 w-28">{label}:</span>
      <span className="text-slate-600">{value}</span>
    </div>
  );
}

function EvidencePanel({ ctx }: { ctx: PortfolioContext }) {
  const [open, setOpen] = useState(false);
  const fmtPct = (n: number) => n.toFixed(1) + "%";
  const fmtVal = (n: number) =>
    "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  return (
    <div className="mt-3 border-t border-blue-200 pt-3">
      <button
        onClick={() => setOpen((s) => !s)}
        className="flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:text-blue-700 transition-colors cursor-pointer"
      >
        Context used {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className="mt-2 rounded-xl bg-white border border-slate-100 px-4 py-3 space-y-2">
          {ctx.totalValue != null && (
            <EvidenceRow label="Total value" value={fmtVal(ctx.totalValue)} />
          )}
          {ctx.largestHolding && (
            <EvidenceRow
              label="Largest holding"
              value={`${ctx.largestHolding.label} — ${fmtPct(ctx.largestHolding.weight)}`}
            />
          )}
          {ctx.top3Weight != null && (
            <EvidenceRow label="Top 3 combined" value={fmtPct(ctx.top3Weight)} />
          )}
          {ctx.holdings && ctx.holdings.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-1">Holdings</span>
              <div className="space-y-0.5">
                {ctx.holdings.map((h) => (
                  <div key={h.ticker || h.name} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">{h.ticker || h.name}</span>
                    <span className="text-slate-400">{fmtPct(h.weight)} · {h.assetType}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {ctx.sectorExposure && ctx.sectorExposure.length > 0 && (
            <EvidenceRow
              label="Top sectors"
              value={ctx.sectorExposure.slice(0, 3).map((s) => `${s.label} ${fmtPct(s.weight)}`).join(", ")}
            />
          )}
          {ctx.geographyExposure && ctx.geographyExposure.length > 0 && (
            <EvidenceRow
              label="Top regions"
              value={ctx.geographyExposure.slice(0, 3).map((g) => `${g.label} ${fmtPct(g.weight)}`).join(", ")}
            />
          )}
          {ctx.concentrationInsights && ctx.concentrationInsights.length > 0 && (
            <EvidenceRow
              label="Concentration"
              value={ctx.concentrationInsights.map((i) => i.title).join("; ")}
            />
          )}
          {ctx.overlapInsights && ctx.overlapInsights.length > 0 && (
            <EvidenceRow
              label="Overlap"
              value={ctx.overlapInsights.map((i) => i.title).join("; ")}
            />
          )}
          {ctx.unknownHoldingCount != null && ctx.unknownHoldingCount > 0 && (
            <EvidenceRow
              label="Unmapped"
              value={`${ctx.unknownHoldingCount} holding(s) — ${ctx.unknownHoldingTickers?.join(", ") || "unknown"}`}
            />
          )}
          {ctx.hasMixedCurrencies && (
            <EvidenceRow label="Currency mix" value="CAD + USD (not converted)" />
          )}
          <p className="text-xs text-slate-400 pt-1 border-t border-slate-100">
            Exposure estimates use simplified static metadata. Not financial advice.
          </p>
        </div>
      )}
    </div>
  );
}

// ── Conversation turn type ────────────────────────────────────────────────────

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  answers: QuizAnswers | null;
  watchedTickers: Set<string>;
  sessionId: string;
  onBack: () => void;
  prefillQuestion?: string;
  portfolioContext?: PortfolioContext;
}

export default function AskCoach({
  answers,
  watchedTickers,
  sessionId,
  onBack,
  prefillQuestion,
  portfolioContext,
}: Props) {
  const [question, setQuestion] = useState(prefillQuestion ?? "");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [history, setHistory] = useState<CoachConversation[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);
  const [conversationTurns, setConversationTurns] = useState<ConversationTurn[]>([]);

  const answerRef = useRef<HTMLDivElement>(null);
  const prefillSubmittedRef = useRef(false);
  const profile = deriveProfile(answers);
  const canSubmit = question.trim().length > 0 && !loading;
  const hasPortfolioContext = !!(portfolioContext && (portfolioContext.holdings?.length ?? 0) > 0);
  const suggestedPrompts = buildPortfolioPrompts(portfolioContext);

  // Loading phase animation
  useEffect(() => {
    if (!loading) {
      setLoadingPhase(0);
      return;
    }
    const t1 = setTimeout(() => setLoadingPhase(1), 1400);
    const t2 = setTimeout(() => setLoadingPhase(2), 3000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [loading]);

  async function loadHistory() {
    if (!sessionId) return;
    const items = await getCoachConversations(sessionId);
    setHistory(items);
    setHistoryLoaded(true);
  }

  useEffect(() => {
    if (sessionId) loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function submitQuestion(q: string) {
    setQuestion(q);
    setLoading(true);
    setLoadingPhase(0);
    setError("");
    setSaveError(false);

    const priorTurns = conversationTurns;

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          profile,
          watchedTickers: Array.from(watchedTickers),
          portfolioContext: portfolioContext ?? null,
          conversationHistory: priorTurns,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setAnswer(data.answer);
        setConversationTurns((prev) => [
          ...prev,
          { role: "user", content: q },
          { role: "assistant", content: data.answer },
        ]);
        setTimeout(() => {
          answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
        saveCoachConversation(sessionId, q, data.answer, profile)
          .then(() => loadHistory())
          .catch(() => setSaveError(true));
      }
    } catch {
      setError("Could not reach the coach. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!prefillQuestion || !sessionId || prefillSubmittedRef.current) return;
    prefillSubmittedRef.current = true;
    submitQuestion(prefillQuestion);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillQuestion, sessionId]);

  async function handleSubmit() {
    if (!canSubmit) return;
    await submitQuestion(question.trim());
  }

  function handleViewHistory(item: CoachConversation) {
    setQuestion(item.question);
    setAnswer(item.answer);
    setTimeout(() => {
      answerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }

  async function handleDelete(id: string) {
    const prev = history;
    setHistory((h) => h.filter((item) => item.id !== id));
    setDeleteErrorId(null);
    try {
      await deleteCoachConversation(id);
    } catch {
      setHistory(prev);
      setDeleteErrorId(id);
    }
  }

  return (
    <PageLayout maxWidth="sm">
      <PageHeader
        title="AI Portfolio Coach"
        description="Ask about your holdings, concentration, exposure, overlap, or investing concepts. Educational only — not financial advice."
        action={
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
        }
      />

      {profile && (
        <p className="text-xs text-blue-600 font-medium mb-4">
          ✦ Answering with your {profile} profile in mind
        </p>
      )}

      {/* No portfolio context nudge */}
      {!hasPortfolioContext && (
        <div className="mb-5 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-600">Add holdings in Portfolio X-Ray</span>{" "}
            to receive portfolio-specific explanations. The coach can still answer general investing
            questions without portfolio data.
          </p>
        </div>
      )}

      {/* Suggested prompts */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
          {hasPortfolioContext ? "About your portfolio" : "Portfolio questions"}
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {suggestedPrompts.map((p) => (
            <button
              key={p}
              onClick={() => setQuestion(p)}
              className="text-xs px-3 py-1.5 rounded-full border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
          Investing concepts
        </p>
        <div className="flex flex-wrap gap-2">
          {CONCEPT_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => setQuestion(p)}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700 transition-colors cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="space-y-3 mb-6">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, 1000))}
          placeholder={
            hasPortfolioContext
              ? "Ask about your holdings, concentration, exposure, overlap, or scenarios…"
              : "Ask about investing concepts — add holdings in Portfolio X-Ray for portfolio-specific answers…"
          }
          rows={3}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{question.length}/1000</span>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {loading ? "Asking…" : "Ask →"}
          </Button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-5 py-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Answer */}
      {(answer || loading) && (
        <div ref={answerRef} className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-blue-100 border-b border-blue-200">
            <span className="text-blue-600 text-sm">✦</span>
            <span className="text-xs font-semibold text-blue-700 uppercase tracking-widest">
              AI Portfolio Coach
            </span>
            {hasPortfolioContext && !loading && (
              <span className="ml-auto text-xs text-blue-500 font-medium">Portfolio-aware</span>
            )}
          </div>
          <div className="px-5 py-4">
            {loading ? (
              <div className="flex items-center gap-3 py-2">
                <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                <span className="text-sm text-blue-700">{LOADING_PHASES[loadingPhase]}</span>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {formatAnswer(answer)}
                </p>
                {hasPortfolioContext && portfolioContext && (
                  <EvidencePanel ctx={portfolioContext} />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {saveError && (
        <p className="mb-4 text-xs text-amber-600">
          Answer shown, but could not save to history.
        </p>
      )}

      {conversationTurns.length > 0 && (
        <p className="mb-4 text-xs text-slate-400">
          {Math.floor(conversationTurns.length / 2)} question
          {Math.floor(conversationTurns.length / 2) === 1 ? "" : "s"} in this session —
          follow-up questions remember prior context.
        </p>
      )}

      <Disclaimer extended="Educational only. The AI Coach explains portfolio concepts and simplified exposure estimates. It does not provide personalized financial advice." />

      {/* Recent questions */}
      {historyLoaded && (
        <div className="mt-10">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
            Recent questions
          </p>
          {history.length === 0 ? (
            <p className="text-sm text-slate-400">Your recent coach questions will appear here.</p>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <Card key={item.id} padding="sm">
                  <p className="text-sm font-medium text-slate-800">{item.question}</p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    {item.answer.replace(/\*\*/g, "").slice(0, 120)}…
                  </p>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-400">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleViewHistory(item)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  {deleteErrorId === item.id && (
                    <p className="text-xs text-red-500 mt-1">Could not delete. Try again.</p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </PageLayout>
  );
}
