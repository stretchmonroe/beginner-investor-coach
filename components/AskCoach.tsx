"use client";

import { useState } from "react";
import type { QuizAnswers } from "./OnboardingQuiz";
import { deriveProfile } from "@/lib/etfs";

const SUGGESTED_PROMPTS = [
  "What is an ETF?",
  "What is diversification?",
  "What is the difference between XEQT and VGRO?",
  "How should I think about monthly investing?",
  "Why does risk tolerance matter?",
];

interface Props {
  answers: QuizAnswers | null;
  watchedTickers: Set<string>;
  onBack: () => void;
}

function formatAnswer(raw: string): React.ReactNode {
  const sections = raw.split(/\*\*(.+?)\*\*/g);
  const nodes: React.ReactNode[] = [];
  for (let i = 0; i < sections.length; i++) {
    if (i % 2 === 1) {
      nodes.push(
        <span key={i} className="font-semibold text-slate-800">
          {sections[i]}
        </span>
      );
    } else if (sections[i]) {
      nodes.push(<span key={i}>{sections[i]}</span>);
    }
  }
  return <>{nodes}</>;
}

export default function AskCoach({ answers, watchedTickers, onBack }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const profile = deriveProfile(answers);
  const canSubmit = question.trim().length > 0 && !loading;

  async function handleSubmit() {
    if (!canSubmit) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question.trim(),
          profile,
          watchedTickers: Array.from(watchedTickers),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
      } else {
        setAnswer(data.answer);
      }
    } catch {
      setError("Could not reach the coach. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-6 py-14 max-w-2xl mx-auto">
      {/* Back */}
      <button
        onClick={onBack}
        className="text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer mb-8 inline-block"
      >
        ← Back to ETFs
      </button>

      {/* Header */}
      <div className="mb-8 space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Ask the Beginner Coach</h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          Ask beginner investing questions in plain English. Educational only — not financial advice.
        </p>
        {profile && (
          <p className="text-xs text-emerald-600 font-medium">
            ✦ Answering with your {profile} profile in mind
          </p>
        )}
      </div>

      {/* Suggested prompts */}
      <div className="mb-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Try a question
        </p>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => setQuestion(p)}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700 transition-colors cursor-pointer"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="space-y-3 mb-8">
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value.slice(0, 500))}
          placeholder="Ask a beginner investing question…"
          rows={3}
          className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{question.length}/500</span>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Asking…" : "Ask →"}
          </button>
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
        <div className="relative rounded-2xl border border-emerald-200 bg-emerald-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-5 py-3 bg-emerald-100 border-b border-emerald-200">
            <span className="text-emerald-600 text-sm">✦</span>
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-widest">
              Beginner Coach
            </span>
          </div>

          <div className="px-5 py-4">
            {loading ? (
              <div className="flex items-center gap-3 py-2">
                <div className="w-4 h-4 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                <span className="text-sm text-emerald-700">Thinking…</span>
              </div>
            ) : (
              <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                {formatAnswer(answer)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="mt-8 rounded-xl bg-slate-100 border border-slate-200 px-5 py-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-600">Educational only. </span>
          Not financial advice. Always consult a licensed financial advisor before making investment decisions.
        </p>
      </div>
    </main>
  );
}
