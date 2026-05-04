"use client";

import { useState } from "react";

export interface QuizAnswers {
  experience: string;
  goal: string;
  timeline: string;
  risk: string;
  monthly: string;
}

interface Question {
  id: keyof QuizAnswers;
  text: string;
  options: string[];
}

const QUESTIONS: Question[] = [
  {
    id: "experience",
    text: "What is your investing experience?",
    options: ["Brand new", "Know the basics", "Already investing"],
  },
  {
    id: "goal",
    text: "What is your main goal?",
    options: ["Retirement", "Build wealth", "Save for a home", "Learn first"],
  },
  {
    id: "timeline",
    text: "What is your investing timeline?",
    options: ["Less than 3 years", "3–10 years", "10+ years"],
  },
  {
    id: "risk",
    text: "How do you feel about risk?",
    options: [
      "I want to avoid losses",
      "I can handle some ups and downs",
      "I am comfortable with higher risk",
    ],
  },
  {
    id: "monthly",
    text: "How much do you plan to invest monthly?",
    options: ["Less than $250", "$250–$750", "$750–$1,500", "$1,500+"],
  },
];

interface Props {
  onComplete: (answers: QuizAnswers) => void;
}

export default function OnboardingQuiz({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});

  const question = QUESTIONS[step];
  const progress = ((step) / QUESTIONS.length) * 100;

  function handleSelect(option: string) {
    const updated = { ...answers, [question.id]: option };
    setAnswers(updated);

    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete(updated as QuizAnswers);
    }
  }

  function handleBack() {
    if (step > 0) setStep(step - 1);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-lg w-full space-y-8">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-400 font-medium">
            <span>Question {step + 1} of {QUESTIONS.length}</span>
            <span>{Math.round(((step + 1) / QUESTIONS.length) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
          <h2 className="text-xl font-semibold text-slate-900 leading-snug">
            {question.text}
          </h2>

          <ul className="space-y-3">
            {question.options.map((option) => {
              const selected = answers[question.id] === option;
              return (
                <li key={option}>
                  <button
                    onClick={() => handleSelect(option)}
                    className={`w-full text-left px-5 py-3.5 rounded-xl border text-sm font-medium transition-colors duration-100 cursor-pointer
                      ${selected
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                        : "border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/50"
                      }`}
                  >
                    {option}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Back navigation */}
        {step > 0 && (
          <div className="flex justify-start">
            <button
              onClick={handleBack}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
