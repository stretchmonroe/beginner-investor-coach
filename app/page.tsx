"use client";

import { useState } from "react";
import Landing from "@/components/Landing";
import OnboardingQuiz from "@/components/OnboardingQuiz";
import QuizResults from "@/components/QuizResults";
import ETFExplorer from "@/components/ETFExplorer";
import type { QuizAnswers } from "@/components/OnboardingQuiz";
import { supabase } from "@/lib/supabase";

type Screen = "landing" | "quiz" | "results" | "etfs";

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

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [answers, setAnswers] = useState<QuizAnswers | null>(null);
  const [sessionId] = useState<string>(() => crypto.randomUUID());

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

  return (
    <>
      {screen === "landing" && <Landing onStart={() => setScreen("quiz")} />}
      {screen === "quiz" && <OnboardingQuiz onComplete={handleQuizComplete} />}
      {screen === "results" && answers && (
        <QuizResults
          answers={answers}
          onRestart={() => setScreen("landing")}
          onExploreETFs={() => setScreen("etfs")}
        />
      )}
      {screen === "etfs" && <ETFExplorer answers={answers} onBack={() => setScreen("results")} />}
    </>
  );
}
