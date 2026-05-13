"use client";

import { useState, useEffect, useRef } from "react";
import { useSubscription } from "@/contexts/SubscriptionContext";
import Landing from "@/components/Landing";
import Onboarding from "@/components/Onboarding";
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
import PremiumPortfolioTools from "@/components/PremiumPortfolioTools";
import type { QuizAnswers } from "@/components/OnboardingQuiz";
import type { ContributionGuidanceSnapshot } from "@/lib/learningPlans";
import type { GoalPlan } from "@/types/readinessPlan";
import type { Etf, Profile } from "@/lib/etfs";
import type { SharedPlanInputs } from "@/types/sharedPlanInputs";
import type { Holding, PortfolioContext } from "@/types/portfolio";
import { SAMPLE_HOLDINGS } from "@/lib/samplePortfolio";
import { trackEvent } from "@/src/lib/analytics";
import type { PortfolioReportData } from "@/lib/portfolioReports";
import { supabase } from "@/lib/supabase";
import {
  fetchWatchlistTickers,
  addWatchlistItem,
  removeWatchlistItem,
} from "@/lib/watchlist";

type Screen = "landing" | "quiz" | "profileselection" | "dashboard" | "etfs" | "watchlist" | "compare" | "simulator" | "coach" | "contribution" | "goalplanner" | "assetclasses" | "portfolioxray" | "portfolioreport" | "privacy" | "reportcomparison" | "premiumtools";

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
  const [isSamplePortfolio, setIsSamplePortfolio] = useState(false);
  const [reportViewData, setReportViewData] = useState<PortfolioReportData | null>(null);
  const [reportViewOrigin, setReportViewOrigin] = useState<"portfolioxray" | "dashboard">("dashboard");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const { refreshSubscription } = useSubscription();
  const refreshCalledRef = useRef(false);

  // Initialise session ID, load watchlist, check first-visit onboarding, and handle Stripe redirects
  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);
    fetchWatchlistTickers(id).then((tickers) => {
      setWatchedTickers(new Set(tickers));
    });
    if (!localStorage.getItem("bic_onboarding_done")) {
      setShowOnboarding(true);
    }

    // Restore quiz answers across page reloads (e.g. after Stripe redirect)
    try {
      const savedAnswers = localStorage.getItem("bic_quiz_answers");
      const savedSkipped = localStorage.getItem("bic_quiz_skipped");
      if (savedAnswers) {
        setAnswers(JSON.parse(savedAnswers));
        setQuizSkipped(savedSkipped === "true");
      }
    } catch {
      /* ignore */
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout_success") === "1") {
      window.history.replaceState({}, "", "/");
      setCheckoutSuccess(true);
      trackEvent("checkout_completed");
      // Restore answers before deciding screen — if none, fall back to portfolioxray
      try {
        const savedAnswers = localStorage.getItem("bic_quiz_answers");
        setScreen(savedAnswers ? "dashboard" : "portfolioxray");
      } catch {
        setScreen("portfolioxray");
      }
      if (!refreshCalledRef.current) {
        refreshCalledRef.current = true;
        setTimeout(() => refreshSubscription(), 2000);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleQuizComplete(a: QuizAnswers) {
    setQuizSkipped(false);
    setAnswers(a);
    try {
      localStorage.setItem("bic_quiz_answers", JSON.stringify(a));
      localStorage.setItem("bic_quiz_skipped", "false");
    } catch { /* ignore */ }
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
    try {
      localStorage.setItem("bic_quiz_answers", JSON.stringify(synthetic));
      localStorage.setItem("bic_quiz_skipped", "true");
    } catch { /* ignore */ }
    setScreen(profileSelectionOrigin === "landing" ? "portfolioxray" : "dashboard");
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

  function dismissOnboarding() {
    localStorage.setItem("bic_onboarding_done", "1");
    setShowOnboarding(false);
  }

  function handleSamplePortfolio() {
    trackEvent("sample_portfolio_started");
    dismissOnboarding();
    if (!answers) {
      const synthetic = syntheticAnswersForProfile("Balanced Beginner");
      setQuizSkipped(true);
      setAnswers(synthetic);
      try {
        localStorage.setItem("bic_quiz_answers", JSON.stringify(synthetic));
        localStorage.setItem("bic_quiz_skipped", "true");
      } catch { /* ignore */ }
    }
    setXrayInitialHoldings(SAMPLE_HOLDINGS);
    setIsSamplePortfolio(true);
    trackEvent('sample_portfolio_loaded');
    setScreen("portfolioxray");
  }

  function handleClearSession() {
    localStorage.removeItem("bic_session_id");
    localStorage.removeItem("bic_quiz_answers");
    localStorage.removeItem("bic_quiz_skipped");
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
          onSelectProfile={(profile) => { setProfileSelectionOrigin("landing"); handleProfileSelect(profile); }}
        />
      )}
      {screen === "quiz" && <OnboardingQuiz onComplete={handleQuizComplete} />}
      {screen === "profileselection" && (
        <ProfileSelection
          onSelect={handleProfileSelect}
          onBack={() => setScreen(profileSelectionOrigin)}
        />
      )}
      {screen === "dashboard" && checkoutSuccess && (
        <div className="fixed top-0 inset-x-0 z-50 flex justify-center pt-4 px-4 pointer-events-none">
          <div className="flex items-center gap-3 bg-teal-700 text-white text-sm px-4 py-3 rounded-xl shadow-lg pointer-events-auto max-w-sm w-full">
            <span className="shrink-0">✓</span>
            <span className="flex-1 font-medium">Premium Tools unlocked. Welcome aboard.</span>
            <button
              onClick={() => setCheckoutSuccess(false)}
              className="shrink-0 text-teal-200 hover:text-white transition-colors"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
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
          onRetakeQuiz={() => { setProfileSelectionOrigin("dashboard"); setScreen("profileselection"); }}
          onRestorePlan={updateSharedPlan}
          onRestoreReport={restorePortfolioReport}
          onViewReport={(data) => viewPortfolioReport(data, "dashboard")}
          onPrivacy={() => setScreen("privacy")}
          onCompareReports={() => setScreen("reportcomparison")}
          onPremiumTools={() => setScreen("premiumtools")}
          onViewOnboarding={() => setShowOnboarding(true)}
        />
      )}
      {screen === "reportcomparison" && (
        <ReportComparison
          sessionId={sessionId}
          onBack={() => setScreen("dashboard")}
          onAskCoach={goToCoach}
          onViewPremium={() => setScreen("premiumtools")}
        />
      )}
      {screen === "premiumtools" && (
        <PremiumPortfolioTools
          onBack={() => setScreen("dashboard")}
          onContinue={() => setScreen("dashboard")}
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
          key={isSamplePortfolio ? "sample" : "live"}
          onBack={() => { setXrayInitialHoldings([]); setIsSamplePortfolio(false); setScreen("dashboard"); }}
          monthlyContribution={sharedPlanInputs.monthlyContribution}
          sessionId={sessionId}
          initialHoldings={xrayInitialHoldings}
          isSample={isSamplePortfolio}
          onClearSample={() => { setXrayInitialHoldings([]); setIsSamplePortfolio(false); }}
          onAskCoach={goToCoach}
          onViewReport={(data) => viewPortfolioReport(data, "portfolioxray")}
          onViewPremiumTools={() => setScreen("premiumtools")}
          onSamplePortfolio={handleSamplePortfolio}
        />
      )}
      {screen === "portfolioreport" && reportViewData && (
        <PortfolioReportView
          data={reportViewData}
          onBack={() => setScreen(reportViewOrigin)}
          onAskCoach={(q) => goToCoach(q)}
          onViewPremiumTools={() => setScreen("premiumtools")}
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
          onViewPremiumTools={() => setScreen("premiumtools")}
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
      <Onboarding
        open={showOnboarding}
        onDismiss={dismissOnboarding}
        onAddHoldings={() => {
          dismissOnboarding();
          if (!answers) {
            const synthetic = syntheticAnswersForProfile("Balanced Beginner");
            setQuizSkipped(true);
            setAnswers(synthetic);
          }
          setXrayInitialHoldings([]);
          setIsSamplePortfolio(false);
          setScreen("portfolioxray");
        }}
        onSamplePortfolio={handleSamplePortfolio}
      />
</>
  );
}
