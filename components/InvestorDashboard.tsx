"use client";

import { useState } from "react";
import type { QuizAnswers } from "./OnboardingQuiz";
import { deriveProfile } from "@/lib/etfs";
import type { Profile } from "@/lib/etfs";
import SavedReadinessPlans from "@/components/SavedReadinessPlans";
import SavedPortfolioReports from "@/components/SavedPortfolioReports";
import type { SharedPlanInputs } from "@/types/sharedPlanInputs";
import type { Holding, PortfolioContext } from "@/types/portfolio";
import type { PortfolioReportData } from "@/lib/portfolioReports";
import PageLayout from "@/components/ui/PageLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Disclaimer from "@/components/ui/Disclaimer";

const profileMeta: Record<
  Profile,
  { badge: string; bgColor: string; borderColor: string; badgeColor: string }
> = {
  "Conservative Beginner": {
    badge: "🛡️",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    badgeColor: "bg-violet-100 text-violet-700",
  },
  "Balanced Beginner": {
    badge: "⚖️",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    badgeColor: "bg-blue-100 text-blue-700",
  },
  "Growth Beginner": {
    badge: "📈",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    badgeColor: "bg-teal-100 text-teal-700",
  },
};

interface Props {
  answers: QuizAnswers;
  quizSkipped: boolean;
  sessionId: string;
  onPortfolioXRay: () => void;
  onAssetClasses: () => void;
  onSimulator: () => void;
  onAskCoach: (question?: string, context?: PortfolioContext) => void;
  onContribution: () => void;
  onRetakeQuiz: () => void;
  onRestorePlan?: (inputs: SharedPlanInputs) => void;
  onRestoreReport?: (holdings: Holding[]) => void;
  onViewReport?: (data: PortfolioReportData) => void;
  onPrivacy?: () => void;
  onCompareReports?: () => void;
  onPremiumTools?: () => void;
  onViewOnboarding?: () => void;
}

export default function InvestorDashboard({
  answers,
  quizSkipped,
  sessionId,
  onPortfolioXRay,
  onAssetClasses,
  onSimulator,
  onAskCoach,
  onContribution,
  onRetakeQuiz,
  onRestorePlan,
  onRestoreReport,
  onViewReport,
  onPrivacy,
  onCompareReports,
  onPremiumTools,
  onViewOnboarding,
}: Props) {
  const [savedPortfolioReportCount, setSavedPortfolioReportCount] = useState(0);
  const [showSavedReports, setShowSavedReports] = useState(false);
  const [showMoreTools, setShowMoreTools] = useState(false);

  const profileLabel = deriveProfile(answers) ?? "Balanced Beginner";
  const meta = profileMeta[profileLabel];

  const moreTools = [
    { label: "Money Snapshot", action: onContribution },
    { label: "Asset Class Explorer", action: onAssetClasses },
    { label: "Coach History", action: () => onAskCoach() },
    { label: "Compare Reports", action: () => onCompareReports?.() },
    { label: "Premium Portfolio Tools", action: () => onPremiumTools?.() },
    { label: "Privacy & Data", action: () => onPrivacy?.() },
    { label: "Replay introduction", action: () => onViewOnboarding?.() },
  ];

  return (
    <PageLayout maxWidth="lg">
      <PageHeader
        title="AI Portfolio Coach"
        description="For Canadian beginner investors — know what you own, what you’re exposed to, and what to consider next."
      />
      {process.env.NEXT_PUBLIC_BETA_MODE === "true" && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Beta</span>
            <span className="text-amber-300">·</span>
            <span className="text-xs text-amber-700">All premium features unlocked</span>
          </div>
          {process.env.NEXT_PUBLIC_FEEDBACK_URL && (
            <a
              href={process.env.NEXT_PUBLIC_FEEDBACK_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors shrink-0"
            >
              Share feedback →
            </a>
          )}
        </div>
      )}

      {/* Profile card */}
      <div className={`rounded-2xl border ${meta.bgColor} ${meta.borderColor} p-5 mb-6`}>
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full ${meta.badgeColor}`}>
            <span>{meta.badge}</span>
            <span>{profileLabel}</span>
          </span>
          {quizSkipped && (
            <span className="text-xs text-slate-400 font-normal px-2 py-1 rounded-full bg-white/60 border border-slate-200">
              Profile selected manually
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onRetakeQuiz}>
            Change profile
          </Button>
        </div>
      </div>

      {/* Primary navigation grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          onClick={onPortfolioXRay}
          className="flex flex-col gap-1.5 bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
        >
          <span className="text-xl">🔍</span>
          <span className="text-sm font-semibold text-slate-800">Portfolio X-Ray</span>
          <span className="text-xs text-slate-500 leading-snug">Understand what you own</span>
        </button>
        <button
          onClick={() => onAskCoach()}
          className="flex flex-col gap-1.5 bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
        >
          <span className="text-xl">✦</span>
          <span className="text-sm font-semibold text-slate-800">AI Portfolio Coach</span>
          <span className="text-xs text-slate-500 leading-snug">Ask anything about investing</span>
        </button>
        <button
          onClick={onSimulator}
          className="flex flex-col gap-1.5 bg-white border border-slate-200 rounded-2xl p-4 text-left hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer"
        >
          <span className="text-xl">📊</span>
          <span className="text-sm font-semibold text-slate-800">Contribution Scenarios</span>
          <span className="text-xs text-slate-500 leading-snug">Model your monthly investing plan</span>
        </button>
        <button
          onClick={() => setShowSavedReports((s) => !s)}
          className={`flex flex-col gap-1.5 border rounded-2xl p-4 text-left hover:border-slate-300 hover:shadow-sm transition-all cursor-pointer ${showSavedReports ? "bg-slate-50 border-slate-300" : "bg-white border-slate-200"}`}
        >
          <span className="text-xl">📋</span>
          <span className="text-sm font-semibold text-slate-800">Saved Reports</span>
          <span className="text-xs text-slate-500 leading-snug">
            {savedPortfolioReportCount > 0
              ? `${savedPortfolioReportCount} portfolio report${savedPortfolioReportCount === 1 ? "" : "s"} saved`
              : "Your saved snapshots"}
          </span>
        </button>
      </div>

      {/* Saved Reports inline panel */}
      {showSavedReports && (
        <div className="mb-6 space-y-6">
          <SavedPortfolioReports
            sessionId={sessionId}
            onCountChange={setSavedPortfolioReportCount}
            onRestoreReport={onRestoreReport}
            onViewReport={onViewReport}
            onAskCoach={onAskCoach}
          />
          <SavedReadinessPlans
            sessionId={sessionId}
            onRestorePlan={onRestorePlan}
            onAskCoach={onAskCoach}
          />
        </div>
      )}

      {/* More tools */}
      <div className="mb-8">
        <button
          onClick={() => setShowMoreTools((s) => !s)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors cursor-pointer mb-2"
        >
          More tools <span className="text-xs">{showMoreTools ? "▲" : "▼"}</span>
        </button>
        {showMoreTools && (
          <Card>
            <div className="divide-y divide-slate-100">
              {moreTools.map((tool) => (
                <button
                  key={tool.label}
                  onClick={tool.action}
                  className="flex items-center justify-between w-full py-3 text-sm text-slate-700 hover:text-blue-600 transition-colors cursor-pointer text-left"
                >
                  <span>{tool.label}</span>
                  <span className="text-slate-300 text-xs">→</span>
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>

      <Disclaimer extended="Always consult a licensed financial advisor before making investment decisions." />
    </PageLayout>
  );
}
