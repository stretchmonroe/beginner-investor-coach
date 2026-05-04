"use client";

import { useState } from "react";
import Landing from "@/components/Landing";
import OnboardingQuiz from "@/components/OnboardingQuiz";
import QuizResults from "@/components/QuizResults";
import ETFExplorer from "@/components/ETFExplorer";
import type { QuizAnswers } from "@/components/OnboardingQuiz";

type Screen = "landing" | "quiz" | "results" | "etfs";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [answers, setAnswers] = useState<QuizAnswers | null>(null);

  function handleQuizComplete(a: QuizAnswers) {
    setAnswers(a);
    setScreen("results");
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
      {screen === "etfs" && <ETFExplorer onBack={() => setScreen("results")} />}
    </>
  );
}
