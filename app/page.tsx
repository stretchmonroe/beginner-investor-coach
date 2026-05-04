"use client";

import { useState, useEffect } from "react";
import Landing from "@/components/Landing";
import OnboardingQuiz from "@/components/OnboardingQuiz";
import QuizResults from "@/components/QuizResults";
import ETFExplorer from "@/components/ETFExplorer";
import Watchlist from "@/components/Watchlist";
import CompareETFs from "@/components/CompareETFs";
import PortfolioSimulator from "@/components/PortfolioSimulator";
import AskCoach from "@/components/AskCoach";
import type { QuizAnswers } from "@/components/OnboardingQuiz";
import type { Etf } from "@/lib/etfs";
import { supabase } from "@/lib/supabase";
import {
  fetchWatchlistTickers,
  addWatchlistItem,
  removeWatchlistItem,
} from "@/lib/watchlist";

type Screen = "landing" | "quiz" | "results" | "etfs" | "watchlist" | "compare" | "simulator" | "coach";

function deriveProfileLabel(a: QuizAnswers): string {
  const riskScore =
    a.risk === "I am comfortable with higher risk" ? 2
    : a.risk === "I can handle some ups and downs" ? 1
    : 0;
  const timelineScore =
    a.timeline === "10+ years" ? 2
    : a.timeline === "3–10 years" ? 1
    : 0;
  const score = riskScore + timelineScore;
  if (score >= 3) return "Growth Beginner";
  if (score >= 1) return "Balanced Beginner";
  return "Conservative Beginner";
}

function getOrCreateSessionId(): string {
  const stored = localStorage.getItem("bic_session_id");
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem("bic_session_id", id);
  return id;
}

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [answers, setAnswers] = useState<QuizAnswers | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [watchedTickers, setWatchedTickers] = useState<Set<string>>(new Set());

  // Initialise session ID and load watchlist from Supabase after mount
  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);
    fetchWatchlistTickers(id).then((tickers) => {
      setWatchedTickers(new Set(tickers));
    });
  }, []);

  function handleQuizComplete(a: QuizAnswers) {
    setAnswers(a);
    setScreen("results");
    supabase.from("quiz_results").insert({
      session_id: sessionId,
      experience: a.experience,
      goal: a.goal,
      timeline: a.timeline,
      risk: a.risk,
      monthly: a.monthly,
      profile: deriveProfileLabel(a),
    }).then(({ error }) => {
      if (error) console.error("Failed to save quiz result:", error.message);
    });
  }

  function handleSave(etf: Etf) {
    setWatchedTickers((prev) => new Set([...prev, etf.ticker]));
    addWatchlistItem(sessionId, etf);
  }

  function handleRemove(ticker: string) {
    setWatchedTickers((prev) => {
      const next = new Set(prev);
      next.delete(ticker);
      return next;
    });
    removeWatchlistItem(sessionId, ticker);
  }

  return (
    <>
      {screen === "landing" && <Landing onStart={() => setScreen("quiz")} />}
      {screen === "quiz" && <OnboardingQuiz onComplete={handleQuizComplete} />}
      {screen === "results" && answers && (
        <QuizResults
          answers={answers}
          onRestart={() => setScreen("landing")}
          onExploreETFs={() => setScreen("etfs")}
          onSimulate={() => setScreen("simulator")}
          onAskCoach={() => setScreen("coach")}
        />
      )}
      {screen === "etfs" && (
        <ETFExplorer
          answers={answers}
          watchedTickers={watchedTickers}
          onSave={handleSave}
          onRemove={handleRemove}
          onViewWatchlist={() => setScreen("watchlist")}
          onCompare={() => setScreen("compare")}
          onSimulate={() => setScreen("simulator")}
          onAskCoach={() => setScreen("coach")}
          onBack={() => setScreen("results")}
        />
      )}
      {screen === "watchlist" && (
        <Watchlist
          watchedTickers={watchedTickers}
          answers={answers}
          onRemove={handleRemove}
          onCompare={() => setScreen("compare")}
          onBack={() => setScreen("etfs")}
        />
      )}
      {screen === "compare" && (
        <CompareETFs
          answers={answers}
          watchedTickers={watchedTickers}
          onBack={() => setScreen("etfs")}
        />
      )}
      {screen === "simulator" && (
        <PortfolioSimulator
          answers={answers}
          onBack={() => setScreen("etfs")}
        />
      )}
      {screen === "coach" && (
        <AskCoach
          answers={answers}
          watchedTickers={watchedTickers}
          onBack={() => setScreen("etfs")}
        />
      )}
</>
  );
}
