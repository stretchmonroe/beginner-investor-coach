"use client";

import { useState, useEffect } from "react";
import Landing from "@/components/Landing";
import OnboardingQuiz from "@/components/OnboardingQuiz";
import ETFExplorer from "@/components/ETFExplorer";
import Watchlist from "@/components/Watchlist";
import CompareETFs from "@/components/CompareETFs";
import PortfolioSimulator from "@/components/PortfolioSimulator";
import AskCoach from "@/components/AskCoach";
import ContributionGuidance from "@/components/ContributionGuidance";
import GoalPlanner from "@/components/GoalPlanner";
import ProfileSelection from "@/components/ProfileSelection";
import AssetClassExplorer from "@/components/AssetClassExplorer";
import InvestorDashboard from "@/components/InvestorDashboard";
import PortfolioXRay from "@/components/PortfolioXRay";
import PortfolioReportView from "@/components/PortfolioReportView";
import PrivacyDataControls from "@/components/PrivacyDataControls";
import ReportComparison from "@/components/ReportComparison";
import type { QuizAnswers } from "@/components/OnboardingQuiz";
import type { ContributionGuidanceSnapshot } from "@/lib/learningPlans";
import type { GoalPlan } from "@/types/readinessPlan";
import type { Etf, Profile } from "@/lib/etfs";
import type { SharedPlanInputs } from "@/types/sharedPlanInputs";
import type { Holding, PortfolioContext } from "@/types/portfolio";
import type { PortfolioReportData } from "@/lib/portfolioReports";
import { supabase } from "@/lib/supabase";
import {
  fetchWatchlistTickers,
  addWatchlistItem,
  removeWatchlistItem,
} from "@/lib/watchlist";

type Screen = "landing" | "quiz" | "profileselection" | "dashboard" | "etfs" | "watchlist" | "compare" | "simulator" | "coach" | "contribution" | "goalplanner" | "assetclasses" | "portfolioxray" | "portfolioreport" | "privacy" | "reportcomparison";

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

function syntheticAnswersForProfile(profile: Profile): QuizAnswers {
  const base = { experience: "skipped", goal: "skipped", monthly: "skipped" };
  if (profile === "Growth Beginner") {
    return { ...base, risk: "I am comfortable with higher risk", timeline: "10+ years" };
  }
  if (profile === "Balanced Beginner") {
    return { ...base, risk: "I can handle some ups and downs", timeline: "3–10 years" };
  }
  return { ...base, risk: "I prefer to avoid losses", timeline: "Less than 3 years" };
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
  const [prefillMonthly, setPrefillMonthly] = useState<number | null>(null);
  const [prefillStarting, setPrefillStarting] = useState<number | null>(null);
  const [quizSkipped, setQuizSkipped] = useState(false);
  const [profileSelectionOrigin, setProfileSelectionOrigin] = useState<"landing" | "dashboard">("landing");
  const [assetClassOrigin, setAssetClassOrigin] = useState<Screen>("dashboard");
  const [contributionOrigin, setContributionOrigin] = useState<Screen>("dashboard");
  const [guidanceSnapshot, setGuidanceSnapshot] = useState<ContributionGuidanceSnapshot | null>(null);
  const [goalPlan, setGoalPlan] = useState<GoalPlan | null>(null);
  const [goalPlannerOrigin, setGoalPlannerOrigin] = useState<Screen>("dashboard");
  const [goalPlannerPrefillMonthly, setGoalPlannerPrefillMonthly] = useState<number | null>(null);
  const [goalPlannerPrefillStarting, setGoalPlannerPrefillStarting] = useState<number | null>(null);
  const [coachPrefillQuestion, setCoachPrefillQuestion] = useState<string | null>(null);
  const [coachPortfolioContext, setCoachPortfolioContext] = useState<PortfolioContext | null>(null);
  const [sharedPlanInputs, setSharedPlanInputs] = useState<SharedPlanInputs>({});
  const [xrayInitialHoldings, setXrayInitialHoldings] = useState<Holding[]>([]);
  const [reportViewData, setReportViewData] = useState<PortfolioReportData | null>(null);
  const [reportViewOrigin, setReportViewOrigin] = useState<"portfolioxray" | "dashboard">("dashboard");

  // Initialise session ID and load watchlist from Supabase after mount
  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);
    fetchWatchlistTickers(id).then((tickers) => {
      setWatchedTickers(new Set(tickers));
    });
  }, []);

  function handleQuizComplete(a: QuizAnswers) {
    setQuizSkipped(false);
    setAnswers(a);
    setScreen("dashboard");
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

  function handleProfileSelect(profile: Profile) {
    const synthetic = syntheticAnswersForProfile(profile);
    setQuizSkipped(true);
    setAnswers(synthetic);
    setScreen("dashboard");
    supabase.from("quiz_results").insert({
      session_id: sessionId,
      profile,
      experience: null,
      goal: null,
      timeline: null,
      risk: null,
      monthly: null,
    }).then(({ error }) => {
      if (error) console.error("Failed to save skipped profile:", error.message);
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

  function goToSimulator() {
    setPrefillMonthly(null);
    setPrefillStarting(null);
    setGoalPlan(null);
    setScreen("simulator");
  }

  function updateSharedPlan(updates: Partial<SharedPlanInputs>) {
    setSharedPlanInputs((prev) => ({ ...prev, ...updates }));
  }

  function goToCoach(question?: string, context?: PortfolioContext) {
    setCoachPrefillQuestion(question ?? null);
    setCoachPortfolioContext(context ?? null);
    setScreen("coach");
  }

  function restorePortfolioReport(holdings: Holding[]) {
    setXrayInitialHoldings(holdings);
    setScreen("portfolioxray");
  }

  function viewPortfolioReport(data: PortfolioReportData, origin: "portfolioxray" | "dashboard") {
    setReportViewData(data);
    setReportViewOrigin(origin);
    setScreen("portfolioreport");
  }

  function handleClearSession() {
    localStorage.removeItem("bic_session_id");
    const newId = crypto.randomUUID();
    localStorage.setItem("bic_session_id", newId);
    setSessionId(newId);
    setWatchedTickers(new Set());
    setAnswers(null);
    setScreen("landing");
  }

  return (
    <>
      {screen === "landing" && (
        <Landing
          onStart={() => { setQuizSkipped(false); setScreen("quiz"); }}
          onSkipQuiz={() => { setProfileSelectionOrigin("landing"); setScreen("profileselection"); }}
        />
      )}
      {screen === "quiz" && <OnboardingQuiz onComplete={handleQuizComplete} />}
      {screen === "profileselection" && (
        <ProfileSelection
          onSelect={handleProfileSelect}
          onBack={() => setScreen(profileSelectionOrigin)}
        />
      )}
      {screen === "dashboard" && answers && (
        <InvestorDashboard
          answers={answers}
          quizSkipped={quizSkipped}
          sessionId={sessionId}
          onPortfolioXRay={() => { setXrayInitialHoldings([]); setScreen("portfolioxray"); }}
          onExploreETFs={() => setScreen("etfs")}
          onAssetClasses={() => { setAssetClassOrigin("dashboard"); setScreen("assetclasses"); }}
          onSimulator={goToSimulator}
          onGoalPlanner={() => {
            setGoalPlannerPrefillMonthly(null);
            setGoalPlannerPrefillStarting(null);
            setGoalPlannerOrigin("dashboard");
            setScreen("goalplanner");
          }}
          onAskCoach={(q) => goToCoach(q)}
          onContribution={() => { setContributionOrigin("dashboard"); setScreen("contribution"); }}
          onWatchlist={() => setScreen("watchlist")}
          onCompare={() => setScreen("compare")}
          onChangeProfile={() => { setProfileSelectionOrigin("dashboard"); setScreen("profileselection"); }}
          onRetakeQuiz={() => setScreen("landing")}
          onRestorePlan={updateSharedPlan}
          onRestoreReport={restorePortfolioReport}
          onViewReport={(data) => viewPortfolioReport(data, "dashboard")}
          onPrivacy={() => setScreen("privacy")}
          onCompareReports={() => setScreen("reportcomparison")}
        />
      )}
      {screen === "reportcomparison" && (
        <ReportComparison
          sessionId={sessionId}
          onBack={() => setScreen("dashboard")}
          onAskCoach={goToCoach}
        />
      )}
      {screen === "privacy" && (
        <PrivacyDataControls
          sessionId={sessionId}
          onBack={() => setScreen("dashboard")}
          onWatchlistCleared={() => setWatchedTickers(new Set())}
          onSessionCleared={handleClearSession}
        />
      )}
      {screen === "portfolioxray" && (
        <PortfolioXRay
          onBack={() => { setXrayInitialHoldings([]); setScreen("dashboard"); }}
          monthlyContribution={sharedPlanInputs.monthlyContribution}
          sessionId={sessionId}
          initialHoldings={xrayInitialHoldings}
          onAskCoach={goToCoach}
          onViewReport={(data) => viewPortfolioReport(data, "portfolioxray")}
        />
      )}
      {screen === "portfolioreport" && reportViewData && (
        <PortfolioReportView
          data={reportViewData}
          onBack={() => setScreen(reportViewOrigin)}
          onAskCoach={(q) => goToCoach(q)}
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
          onSimulate={goToSimulator}
          onAskCoach={() => goToCoach()}
          onBack={() => setScreen("dashboard")}
          onAssetClassExplorer={() => { setAssetClassOrigin("etfs"); setScreen("assetclasses"); }}
        />
      )}
      {screen === "watchlist" && (
        <Watchlist
          watchedTickers={watchedTickers}
          answers={answers}
          onRemove={handleRemove}
          onCompare={() => setScreen("compare")}
          onBack={() => setScreen("dashboard")}
        />
      )}
      {screen === "compare" && (
        <CompareETFs
          answers={answers}
          watchedTickers={watchedTickers}
          onBack={() => setScreen("dashboard")}
        />
      )}
      {screen === "simulator" && (
        <PortfolioSimulator
          answers={answers}
          prefillMonthly={prefillMonthly}
          prefillStarting={prefillStarting}
          sessionId={sessionId}
          guidanceSnapshot={guidanceSnapshot}
          goalPlan={goalPlan}
          onBack={() => setScreen("dashboard")}
          onContributionGuidance={() => { setContributionOrigin("simulator"); setScreen("contribution"); }}
          onGoalPlanner={(starting, monthly) => {
            setGoalPlannerPrefillStarting(starting > 0 ? starting : null);
            setGoalPlannerPrefillMonthly(monthly > 0 ? monthly : null);
            setGoalPlannerOrigin("simulator");
            setScreen("goalplanner");
          }}
          onAssetClassExplorer={() => { setAssetClassOrigin("simulator"); setScreen("assetclasses"); }}
          onAskCoach={goToCoach}
          sharedPlanInputs={sharedPlanInputs}
          onSharedInputsChange={updateSharedPlan}
        />
      )}
      {screen === "coach" && (
        <AskCoach
          answers={answers}
          watchedTickers={watchedTickers}
          sessionId={sessionId}
          onBack={() => setScreen("dashboard")}
          prefillQuestion={coachPrefillQuestion ?? undefined}
          portfolioContext={coachPortfolioContext ?? undefined}
        />
      )}
      {screen === "contribution" && (
        <ContributionGuidance
          answers={answers}
          onBack={() => setScreen(contributionOrigin)}
          onGuidanceResult={setGuidanceSnapshot}
          onUseInSimulator={(monthly, starting) => {
            if (monthly > 0) setPrefillMonthly(monthly);
            if (starting > 0) setPrefillStarting(starting);
            updateSharedPlan({
              monthlyContribution: monthly > 0 ? monthly : undefined,
              startingInvestmentAmount: starting > 0 ? starting : undefined,
            });
            setGoalPlan(null);
            setScreen("simulator");
          }}
          onGoalPlanner={(monthly, starting) => {
            setGoalPlannerPrefillMonthly(monthly > 0 ? monthly : null);
            setGoalPlannerPrefillStarting(starting > 0 ? starting : null);
            updateSharedPlan({
              monthlyContribution: monthly > 0 ? monthly : undefined,
              startingInvestmentAmount: starting > 0 ? starting : undefined,
            });
            setGoalPlannerOrigin("contribution");
            setScreen("goalplanner");
          }}
          onAskCoach={goToCoach}
          sharedPlanInputs={sharedPlanInputs}
          onSharedInputsChange={updateSharedPlan}
        />
      )}
      {screen === "goalplanner" && (
        <GoalPlanner
          answers={answers}
          prefillMonthly={goalPlannerPrefillMonthly}
          prefillStarting={goalPlannerPrefillStarting}
          onBack={() => setScreen(goalPlannerOrigin)}
          onUseInSimulator={(monthly, starting, plan) => {
            if (monthly > 0) setPrefillMonthly(monthly);
            if (starting > 0) setPrefillStarting(starting);
            updateSharedPlan({
              monthlyContribution: monthly > 0 ? monthly : undefined,
              startingInvestmentAmount: starting > 0 ? starting : undefined,
            });
            setGoalPlan(plan ?? null);
            setScreen("simulator");
          }}
          onAskCoach={goToCoach}
          sharedPlanInputs={sharedPlanInputs}
          onSharedInputsChange={updateSharedPlan}
        />
      )}
      {screen === "assetclasses" && (
        <AssetClassExplorer onBack={() => setScreen(assetClassOrigin)} />
      )}
</>
  );
}
