"use client";

import { useState, useEffect, useRef } from "react";
import type { QuizAnswers } from "./OnboardingQuiz";
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

const READINESS_PROMPTS = [
  "Explain my investing capacity",
  "What does my goal gap mean?",
  "What is a return assumption?",
  "Why does protected savings matter?",
  "What is the difference between a sample allocation and a recommendation?",
];

const CONCEPT_PROMPTS = [
  "What is an ETF?",
  "What is diversification?",
  "What is a bond ETF?",
  "How should I think about ETFs vs mutual funds?",
  "Why does time horizon matter for investing?",
];

interface Props {
  answers: QuizAnswers | null;
  watchedTickers: Set<string>;
  sessionId: string;
  onBack: () => void;
  prefillQuestion?: string;
}

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

export default function AskCoach({ answers, watchedTickers, sessionId, onBack, prefillQuestion }: Props) {
  const [question, setQuestion] = useState(prefillQuestion ?? "");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saveError, setSaveError] = useState(false);
  const [history, setHistory] = useState<CoachConversation[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [deleteErrorId, setDeleteErrorId] = useState<string | null>(null);

  const answerRef = useRef<HTMLDivElement>(null);
  const prefillSubmittedRef = useRef(false);
  const profile = deriveProfile(answers);
  const canSubmit = question.trim().length > 0 && !loading;

  async function loadHistory() {
    if (!sessionId) return;
    const items = await getCoachConversations(sessionId);
    setHistory(items);
    setHistoryLoaded(true);
  }

  useEffect(() => {
    if (sessionId) loadHistory();
  }, [sessionId]);

  async function submitQuestion(q: string) {
    setQuestion(q);
    setLoading(true);
    setError("");
    setSaveError(false);

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          profile,
          watchedTickers: Array.from(watchedTickers),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setAnswer(data.answer);
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
        title="Ask the Readiness Coach"
        description="Ask questions about your investing readiness, goal feasibility, sample allocation, or investment basics. Educational only — not financial advice."
        action={
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
        }
      />

      {profile && (
        <p className="text-xs text-blue-600 font-medium mb-5">
          ✦ Answering with your {profile} profile in mind
        </p>
      )}

      {/* Suggested prompts */}
      <div className="mb-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
          Readiness questions
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          {READINESS_PROMPTS.map((p) => (
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
          placeholder="Ask a question about your readiness plan or investing concepts…"
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
              Readiness Coach
            </span>
          </div>
          <div className="px-5 py-4">
            {loading ? (
              <div className="flex items-center gap-3 py-2">
                <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                <span className="text-sm text-blue-700">Thinking…</span>
              </div>
            ) : (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {formatAnswer(answer)}
              </p>
            )}
          </div>
        </div>
      )}

      {saveError && (
        <p className="mb-4 text-xs text-amber-600">
          Answer shown, but could not save to history.
        </p>
      )}

      <Disclaimer extended="Always consult a licensed financial advisor before making investment decisions." />

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
