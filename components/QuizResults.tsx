import type { QuizAnswers } from "./OnboardingQuiz";

type Profile = "Conservative Beginner" | "Balanced Beginner" | "Growth Beginner";

interface ProfileDetails {
  label: Profile;
  badge: string;
  color: string;
  explanation: string;
}

function deriveProfile(answers: QuizAnswers): ProfileDetails {
  // Score risk: 0 = avoid losses, 1 = some ups/downs, 2 = higher risk
  const riskScore =
    answers.risk === "I am comfortable with higher risk"
      ? 2
      : answers.risk === "I can handle some ups and downs"
      ? 1
      : 0;

  // Score timeline: 0 = short, 1 = medium, 2 = long
  const timelineScore =
    answers.timeline === "10+ years"
      ? 2
      : answers.timeline === "3–10 years"
      ? 1
      : 0;

  const score = riskScore + timelineScore;

  if (score >= 3) {
    return {
      label: "Growth Beginner",
      badge: "📈",
      color: "emerald",
      explanation:
        "You have a long time horizon and are comfortable with market ups and downs. That's a great combination for long-term wealth building. Growth-oriented index funds and diversified ETFs are often a good starting point for investors like you.",
    };
  }

  if (score >= 1) {
    return {
      label: "Balanced Beginner",
      badge: "⚖️",
      color: "blue",
      explanation:
        "You want some growth but aren't ready to take on a lot of risk — that's very common and completely reasonable. A balanced mix of stock and bond funds can help you grow your money steadily while limiting big swings.",
    };
  }

  return {
    label: "Conservative Beginner",
    badge: "🛡️",
    color: "violet",
    explanation:
      "You prefer to protect what you have and avoid large losses. That's a smart starting point. Lower-risk options like bond funds, money market funds, or high-yield savings accounts may suit your style while you build confidence.",
  };
}

const colorMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-800",
    badge: "bg-emerald-100 text-emerald-700",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    badge: "bg-blue-100 text-blue-700",
  },
  violet: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-800",
    badge: "bg-violet-100 text-violet-700",
  },
};

interface Props {
  answers: QuizAnswers;
  onRestart: () => void;
  onExploreETFs: () => void;
  onSimulate: () => void;
  onAskCoach: () => void;
}

export default function QuizResults({ answers, onRestart, onExploreETFs, onSimulate, onAskCoach }: Props) {
  const profile = deriveProfile(answers);
  const colors = colorMap[profile.color];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-lg w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-sm font-medium text-slate-400 uppercase tracking-widest">
            Your investor profile
          </p>
          <h1 className="text-3xl font-bold text-slate-900">{profile.label}</h1>
        </div>

        {/* Profile card */}
        <div className={`rounded-2xl border ${colors.bg} ${colors.border} p-8 space-y-4`}>
          <div className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full ${colors.badge}`}>
            <span>{profile.badge}</span>
            <span>{profile.label}</span>
          </div>

          <p className={`text-base leading-relaxed ${colors.text}`}>
            {profile.explanation}
          </p>
        </div>

        {/* Disclaimer */}
        <div className="rounded-xl bg-slate-100 border border-slate-200 px-5 py-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-600">Educational only.</span>{" "}
            This profile is based on a short quiz and is intended to help you
            learn — not to guide actual investment decisions. Always consult a
            licensed financial advisor before investing.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onExploreETFs}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-sm px-6 py-3.5 rounded-xl transition-colors cursor-pointer"
          >
            Explore beginner ETFs
          </button>

          <button
            onClick={onSimulate}
            className="w-full bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 font-semibold text-sm px-6 py-3.5 rounded-xl transition-colors cursor-pointer"
          >
            Try portfolio simulator
          </button>

          <button
            onClick={onAskCoach}
            className="w-full bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 font-semibold text-sm px-6 py-3.5 rounded-xl transition-colors cursor-pointer"
          >
            ✦ Ask the Coach
          </button>

          <button
            onClick={onRestart}
            className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer py-2"
          >
            ← Start over
          </button>
        </div>
      </div>
    </main>
  );
}
