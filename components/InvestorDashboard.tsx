"use client";

import { useState, useEffect } from "react";
import type { QuizAnswers } from "./OnboardingQuiz";
import { deriveProfile } from "@/lib/etfs";
import type { Profile } from "@/lib/etfs";
import type { ContributionGuidanceSnapshot } from "@/lib/learningPlans";
import { getLearningPlans } from "@/lib/learningPlans";
import PageLayout from "@/components/ui/PageLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import ToolCard from "@/components/ui/ToolCard";
import Disclaimer from "@/components/ui/Disclaimer";
import SectionHeader from "@/components/ui/SectionHeader";

const profileMeta: Record<
  Profile,
  { badge: string; bgColor: string; borderColor: string; textColor: string; badgeColor: string; explanation: string }
> = {
  "Conservative Beginner": {
    badge: "🛡️",
    bgColor: "bg-violet-50",
    borderColor: "border-violet-200",
    textColor: "text-violet-800",
    badgeColor: "bg-violet-100 text-violet-700",
    explanation:
      "You may prefer a safer investing experience and want to reduce large swings where possible. Focus first on protected savings, contribution comfort, and lower-volatility investment types.",
  },
  "Balanced Beginner": {
    badge: "⚖️",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-800",
    badgeColor: "bg-blue-100 text-blue-700",
    explanation:
      "You may want a mix of growth and stability. Focus first on contribution consistency, goal feasibility, and understanding how much volatility you can realistically handle.",
  },
  "Growth Beginner": {
    badge: "📈",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    textColor: "text-teal-800",
    badgeColor: "bg-teal-100 text-teal-700",
    explanation:
      "You may have a longer timeline and be more comfortable with market swings. Focus first on diversification, contribution habits, and staying invested through volatility.",
  },
};

interface Props {
  answers: QuizAnswers;
  quizSkipped: boolean;
  sessionId: string;
  watchedTickers: Set<string>;
  guidanceSnapshot: ContributionGuidanceSnapshot | null;
  hasVisitedETFs: boolean;
  hasVisitedAssetClasses: boolean;
  hasVisitedGoalPlanner: boolean;
  hasVisitedSimulator: boolean;
  hasAskedCoach: boolean;
  onExploreETFs: () => void;
  onAssetClasses: () => void;
  onSimulator: () => void;
  onGoalPlanner: () => void;
  onAskCoach: () => void;
  onContribution: () => void;
  onWatchlist: () => void;
  onCompare: () => void;
  onViewProfile: () => void;
  onRetakeQuiz: () => void;
}

interface NextStep {
  stepLabel: string;
  label: string;
  desc: string;
  actionLabel: string;
  action: () => void;
}

export default function InvestorDashboard({
  answers,
  quizSkipped,
  sessionId,
  watchedTickers,
  guidanceSnapshot,
  hasVisitedETFs,
  hasVisitedAssetClasses,
  hasVisitedGoalPlanner,
  hasVisitedSimulator,
  hasAskedCoach,
  onExploreETFs,
  onAssetClasses,
  onSimulator,
  onGoalPlanner,
  onAskCoach,
  onContribution,
  onWatchlist,
  onCompare,
  onViewProfile,
  onRetakeQuiz,
}: Props) {
  const [savedPlansCount, setSavedPlansCount] = useState(0);

  useEffect(() => {
    if (!sessionId) return;
    getLearningPlans(sessionId).then((plans) => setSavedPlansCount(plans.length));
  }, [sessionId]);

  const profileLabel = deriveProfile(answers) ?? "Balanced Beginner";
  const meta = profileMeta[profileLabel];

  function getNextStep(): NextStep | null {
    if (!guidanceSnapshot) return {
      stepLabel: "Step 1 of 6",
      label: "Estimate your contribution capacity",
      desc: "Use your income, bills, savings buckets, and lifestyle buffer to estimate a monthly contribution range to consider.",
      actionLabel: "Open Money Snapshot",
      action: onContribution,
    };
    if (!hasVisitedGoalPlanner) return {
      stepLabel: "Step 2 of 6",
      label: "Check goal feasibility",
      desc: "Work backward from a target amount and timeline to estimate the monthly contribution needed.",
      actionLabel: "Open Goal Feasibility",
      action: onGoalPlanner,
    };
    if (!hasVisitedSimulator) return {
      stepLabel: "Step 3 of 6",
      label: "Build a sample learning allocation",
      desc: "See how a sample portfolio could be split by role — growth, stability, and cash-like options.",
      actionLabel: "Open Portfolio Simulator",
      action: onSimulator,
    };
    if (savedPlansCount === 0) return {
      stepLabel: "Step 4 of 6",
      label: "Save your readiness plan",
      desc: "Save your budget inputs, goal estimate, sample allocation, and projection so you can revisit them later.",
      actionLabel: "Review and Save Plan",
      action: onSimulator,
    };
    if (!hasVisitedAssetClasses) return {
      stepLabel: "Step 5 of 6",
      label: "Learn about investment types",
      desc: "Explore equity ETFs, bond ETFs, all-in-one ETFs, mutual funds, and cash-like investments.",
      actionLabel: "Explore Asset Classes",
      action: onAssetClasses,
    };
    if (!hasAskedCoach) return {
      stepLabel: "Step 6 of 6",
      label: "Ask the coach a question",
      desc: "Use the beginner coach to clarify anything you've learned so far.",
      actionLabel: "Ask the Coach",
      action: onAskCoach,
    };
    return null;
  }

  const nextStep = getNextStep();

  const checklistItems = [
    {
      label: "Choose investor profile",
      desc: "Know your risk tolerance and investing timeline.",
      done: true,
      action: onViewProfile,
    },
    {
      label: "Estimate contribution capacity",
      desc: "Understand how much you may be able to invest monthly.",
      done: guidanceSnapshot != null,
      action: onContribution,
    },
    {
      label: "Check goal feasibility",
      desc: "Work backward from a target amount and timeline.",
      done: hasVisitedGoalPlanner,
      action: onGoalPlanner,
    },
    {
      label: "Build a sample learning allocation",
      desc: "See how a sample portfolio could be structured by role.",
      done: hasVisitedSimulator,
      action: onSimulator,
    },
    {
      label: "Review what-if projection",
      desc: "Understand how contributions may grow over time based on assumptions.",
      done: hasVisitedSimulator,
      action: onSimulator,
    },
    {
      label: "Save readiness plan",
      desc: "Save your inputs and estimates for future reference.",
      done: savedPlansCount > 0,
      action: onSimulator,
    },
    {
      label: "Learn about investment types",
      desc: "Understand equity ETFs, bond ETFs, mutual funds, and cash-like options.",
      done: hasVisitedAssetClasses,
      action: onAssetClasses,
    },
    {
      label: "Ask the coach",
      desc: "Get plain-language answers to your investing questions.",
      done: hasAskedCoach,
      action: onAskCoach,
    },
  ];

  const completedCount = checklistItems.filter((i) => i.done).length;
  const showActivity = watchedTickers.size > 0 || savedPlansCount > 0;

  const planTools = [
    { icon: "$", title: "Money Snapshot", description: "Estimate your investing capacity from your budget", action: onContribution },
    { icon: "◎", title: "Goal Feasibility", description: "Work backwards from a target to estimate required monthly contributions", action: onGoalPlanner },
    { icon: "⊞", title: "Sample Learning Allocation", description: "Build a sample learning allocation and review what-if projections", action: onSimulator },
    { icon: "📋", title: "Saved Plans", description: "Review your saved readiness plans and learning allocations", action: onSimulator },
  ];

  const learnTools = [
    { icon: "≡", title: "Asset Class Explorer", description: "Learn about equity ETFs, bond ETFs, mutual funds, and cash options", action: onAssetClasses },
    { icon: "★", title: "ETF Explorer", description: "Browse beginner-friendly ETF examples by risk level", action: onExploreETFs },
    { icon: "☆", title: "Watchlist", description: "Track ETF examples you've saved for further learning", action: onWatchlist },
    { icon: "⇄", title: "Compare ETFs", description: "Compare two ETF examples side by side", action: onCompare },
  ];

  const coachTools = [
    { icon: "✦", title: "Ask the Coach", description: "Ask plain-language questions about investing concepts", action: onAskCoach },
    { icon: "🕐", title: "Coach History", description: "Review your previous coach conversations", action: onAskCoach },
  ];

  // suppress unused-var warning — hasVisitedETFs is received but checklist uses ETF watchlist count instead
  void hasVisitedETFs;

  return (
    <PageLayout maxWidth="lg">
      {/* Header */}
      <PageHeader
        title="Your Investor Dashboard"
        action={
          <Button variant="ghost" size="sm" onClick={onRetakeQuiz}>
            ← Retake quiz
          </Button>
        }
      />

      {/* Profile summary card */}
      <div className={`rounded-2xl border ${meta.bgColor} ${meta.borderColor} p-6 mb-4`}>
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
        <p className={`text-sm leading-relaxed ${meta.textColor} mb-3`}>{meta.explanation}</p>
        <button
          onClick={onViewProfile}
          className={`text-xs font-medium ${meta.textColor} opacity-70 hover:opacity-100 transition-opacity cursor-pointer`}
        >
          View profile details →
        </button>
      </div>

      {/* Compact disclaimer */}
      <div className="mb-6">
        <Disclaimer />
      </div>

      {/* Next best step */}
      {nextStep ? (
        <div className="rounded-2xl bg-blue-600 p-6 mb-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-200 mb-1">{nextStep.stepLabel}</p>
          <h2 className="text-lg font-bold mb-1">{nextStep.label}</h2>
          <p className="text-sm text-blue-100 leading-relaxed mb-4">{nextStep.desc}</p>
          <Button
            variant="secondary"
            onClick={nextStep.action}
            className="text-blue-700 border-white/30 hover:bg-blue-50"
          >
            {nextStep.actionLabel}
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl bg-teal-600 p-6 mb-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-200 mb-1">Journey complete</p>
          <h2 className="text-lg font-bold mb-1">You&apos;ve completed the core readiness journey</h2>
          <p className="text-sm text-teal-100 leading-relaxed">
            You&apos;ve worked through all six steps. Use the tools below to continue learning and refining your plan.
          </p>
        </div>
      )}

      {/* Readiness journey checklist */}
      <div className="mb-6">
        <SectionHeader title="Your beginner investing readiness journey" />
        <Card>
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs text-slate-400">{completedCount} / {checklistItems.length} steps complete</span>
          </div>
          <div className="space-y-4">
            {checklistItems.map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <span className={`shrink-0 text-sm font-bold mt-0.5 ${item.done ? "text-teal-500" : "text-slate-200"}`}>
                  {item.done ? "✓" : "○"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${item.done ? "text-slate-700" : "text-slate-400"}`}>
                    {item.label}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                </div>
                {!item.done && (
                  <button
                    onClick={item.action}
                    className="shrink-0 text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Open →
                  </button>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Activity summary */}
      {showActivity && (
        <div className="flex gap-4 mb-6">
          {watchedTickers.size > 0 && (
            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
              <p className="text-2xl font-bold text-slate-800">{watchedTickers.size}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                ETF{watchedTickers.size !== 1 ? "s" : ""} in watchlist
              </p>
            </div>
          )}
          {savedPlansCount > 0 && (
            <div className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
              <p className="text-2xl font-bold text-slate-800">{savedPlansCount}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                plan{savedPlansCount !== 1 ? "s" : ""} saved
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tools section */}
      <div className="mb-8">
        <SectionHeader title="Tools" />

        <div className="space-y-6">
          {/* Plan */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Plan</p>
            <p className="text-xs text-slate-400 mb-3">Understand your budget, set a goal, and build a sample allocation.</p>
            <div className="grid grid-cols-2 gap-3">
              {planTools.map((tool) => (
                <ToolCard key={tool.title} icon={tool.icon} title={tool.title} description={tool.description} onClick={tool.action} />
              ))}
            </div>
          </div>

          {/* Learn */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Learn</p>
            <p className="text-xs text-slate-400 mb-3">Explore investment types before making any decisions.</p>
            <div className="grid grid-cols-2 gap-3">
              {learnTools.map((tool) => (
                <ToolCard key={tool.title} icon={tool.icon} title={tool.title} description={tool.description} onClick={tool.action} />
              ))}
            </div>
          </div>

          {/* Coach */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Coach</p>
            <p className="text-xs text-slate-400 mb-3">Get plain-language answers to your investing questions.</p>
            <div className="grid grid-cols-2 gap-3">
              {coachTools.map((tool) => (
                <ToolCard key={tool.title} icon={tool.icon} title={tool.title} description={tool.description} onClick={tool.action} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <Disclaimer extended="Always consult a licensed financial advisor before making investment decisions." />
    </PageLayout>
  );
}
