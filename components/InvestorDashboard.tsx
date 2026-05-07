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
  onExploreETFs: () => void;
  onAssetClasses: () => void;
  onSimulator: () => void;
  onGoalPlanner: () => void;
  onAskCoach: (question?: string, context?: PortfolioContext) => void;
  onContribution: () => void;
  onWatchlist: () => void;
  onCompare: () => void;
  onChangeProfile: () => void;
  onRetakeQuiz: () => void;
  onRestorePlan?: (inputs: SharedPlanInputs) => void;
  onRestoreReport?: (holdings: Holding[]) => void;
  onViewReport?: (data: PortfolioReportData) => void;
  onPrivacy?: () => void;
  onCompareReports?: () => void;
}

export default function InvestorDashboard({
  answers,
  quizSkipped,
  sessionId,
  onPortfolioXRay,
  onExploreETFs,
  onAssetClasses,
  onSimulator,
  onGoalPlanner,
  onAskCoach,
  onContribution,
  onWatchlist,
  onCompare,
  onChangeProfile,
  onRetakeQuiz,
  onRestorePlan,
  onRestoreReport,
  onViewReport,
  onPrivacy,
  onCompareReports,
}: Props) {
  const [savedPortfolioReportCount, setSavedPortfolioReportCount] = useState(0);
  const [showSavedReports, setShowSavedReports] = useState(false);
  const [showMoreTools, setShowMoreTools] = useState(false);

  const profileLabel = deriveProfile(answers) ?? "Balanced Beginner";
  const meta = profileMeta[profileLabel];

  const moreTools = [
    { label: "Money Snapshot", action: onContribution },
    { label: "Goal Feasibility", action: onGoalPlanner },
    { label: "Sample Learning Allocation", action: onSimulator },
    { label: "Asset Class Explorer", action: onAssetClasses },
    { label: "ETF Explorer", action: onExploreETFs },
    { label: "Compare ETFs", action: onCompare },
    { label: "Watchlist", action: onWatchlist },
    { label: "Coach History", action: () => onAskCoach() },
    { label: "Change Profile", action: onChangeProfile },
    { label: "Retake Quiz", action: onRetakeQuiz },
    { label: "Compare Reports", action: () => onCompareReports?.() },
    { label: "Privacy & Data", action: () => onPrivacy?.() },
  ];

  return (
    <PageLayout maxWidth="lg">
      <PageHeader title="AI Portfolio Coach" />

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
          <Button variant="secondary" size="sm" onClick={onChangeProfile}>
            Change profile
          </Button>
          <button
            onClick={onRetakeQuiz}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
          >
            Retake quiz →
          </button>
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
