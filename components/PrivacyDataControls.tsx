"use client";

import { useState } from "react";
import { deleteAllPortfolioReports } from "@/lib/portfolioReports";
import { deleteAllCoachConversations } from "@/lib/coachHistory";
import { deleteAllReadinessPlans } from "@/lib/readinessPlans";
import { clearWatchlist } from "@/lib/watchlist";
import PageLayout from "@/components/ui/PageLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Disclaimer from "@/components/ui/Disclaimer";

// ─── Types ────────────────────────────────────────────────────────────────────

type ActionId =
  | "portfolioReports"
  | "coachHistory"
  | "readinessPlans"
  | "watchlist"
  | "allData"
  | "localSession";

type ActionState = "idle" | "confirming" | "deleting" | "done" | "error";

interface DeleteAction {
  id: ActionId;
  label: string;
  description: string;
  confirmMsg: string;
}

interface Props {
  sessionId: string;
  onBack: () => void;
  onWatchlistCleared?: () => void;
  onSessionCleared?: () => void;
}

// ─── Delete action definitions ────────────────────────────────────────────────

const DELETE_ACTIONS: DeleteAction[] = [
  {
    id: "portfolioReports",
    label: "Delete saved portfolio reports",
    description: "Removes all saved Portfolio X-Ray reports for this session.",
    confirmMsg:
      "This will delete all saved portfolio reports for this browser session. This cannot be undone.",
  },
  {
    id: "coachHistory",
    label: "Delete AI Coach history",
    description: "Removes all AI Coach questions and answers for this session.",
    confirmMsg:
      "This will delete your AI Coach history for this browser session. This cannot be undone.",
  },
  {
    id: "readinessPlans",
    label: "Delete saved readiness plans",
    description: "Removes all saved readiness plans for this session.",
    confirmMsg:
      "This will delete all saved readiness plans for this browser session. This cannot be undone.",
  },
  {
    id: "watchlist",
    label: "Clear watchlist",
    description: "Removes all tickers saved to your watchlist for this session.",
    confirmMsg:
      "This will clear your watchlist for this browser session. This cannot be undone.",
  },
  {
    id: "allData",
    label: "Delete all saved anonymous data",
    description:
      "Deletes portfolio reports, AI Coach history, readiness plans, and watchlist for this session.",
    confirmMsg:
      "This will delete all saved data linked to this browser session. This cannot be undone.",
  },
  {
    id: "localSession",
    label: "Reset browser session",
    description:
      "Clears your local session ID. Saved data will no longer be linked to this browser.",
    confirmMsg:
      "This will reset your browser session ID. Any previously saved data will no longer appear in this browser. This cannot be undone.",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrivacyDataControls({
  sessionId,
  onBack,
  onWatchlistCleared,
  onSessionCleared,
}: Props) {
  const [states, setStates] = useState<Partial<Record<ActionId, ActionState>>>({});

  function getState(id: ActionId): ActionState {
    return states[id] ?? "idle";
  }

  function setState(id: ActionId, s: ActionState) {
    setStates((prev) => ({ ...prev, [id]: s }));
  }

  async function runDelete(id: ActionId) {
    setState(id, "deleting");
    try {
      if (id === "portfolioReports") {
        await deleteAllPortfolioReports(sessionId);
      } else if (id === "coachHistory") {
        await deleteAllCoachConversations(sessionId);
      } else if (id === "readinessPlans") {
        await deleteAllReadinessPlans(sessionId);
      } else if (id === "watchlist") {
        await clearWatchlist(sessionId);
        onWatchlistCleared?.();
      } else if (id === "allData") {
        await Promise.all([
          deleteAllPortfolioReports(sessionId),
          deleteAllCoachConversations(sessionId),
          deleteAllReadinessPlans(sessionId),
          clearWatchlist(sessionId),
        ]);
        onWatchlistCleared?.();
      } else if (id === "localSession") {
        localStorage.removeItem("bic_session_id");
        onSessionCleared?.();
        return;
      }
      setState(id, "done");
    } catch {
      setState(id, "error");
    }
  }

  const shortSession = sessionId
    ? `${sessionId.slice(0, 8)}…${sessionId.slice(-4)}`
    : "—";

  return (
    <PageLayout maxWidth="lg">
      <PageHeader
        title="Privacy & Data"
        description="See what is saved, what stays local, and delete data when needed."
        action={
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
        }
      />

      {/* ── Session info ── */}
      <Card className="mb-6">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
          Your session
        </p>
        <p className="text-sm text-slate-600 leading-relaxed mb-2">
          This app does not use accounts or logins. Your data is stored anonymously under a
          session ID generated in your browser.
        </p>
        <p className="text-xs text-slate-400">
          Session ID:{" "}
          <span className="font-mono text-slate-500">{shortSession}</span>
        </p>
      </Card>

      {/* ── What is saved ── */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">What is saved</h2>
        <div className="space-y-3">
          <Card padding="sm">
            <p className="text-xs font-semibold text-slate-700 mb-1">Portfolio data</p>
            <p className="text-sm text-slate-500 leading-relaxed">
              Holdings you enter or import are used to create your Portfolio X-Ray, exposure
              estimates, scenarios, and reports. Saved Portfolio Reports are stored anonymously
              using your browser&apos;s anonymous session ID.
            </p>
          </Card>
          <Card padding="sm">
            <p className="text-xs font-semibold text-slate-700 mb-1">AI Coach history</p>
            <p className="text-sm text-slate-500 leading-relaxed">
              AI Coach questions and answers may be saved anonymously so you can review your
              history. They are linked to your session ID and not to any personal account.
            </p>
          </Card>
          <Card padding="sm">
            <p className="text-xs font-semibold text-slate-700 mb-1">Watchlist and plans</p>
            <p className="text-sm text-slate-500 leading-relaxed">
              Your watchlist and saved readiness plans are stored anonymously using your session
              ID.
            </p>
          </Card>
        </div>
      </div>

      {/* ── What stays local ── */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">What stays local</h2>
        <div className="space-y-3">
          <Card padding="sm">
            <p className="text-xs font-semibold text-slate-700 mb-1">Holdings in the current session</p>
            <p className="text-sm text-slate-500 leading-relaxed">
              Holdings you enter or import during a session are held in memory only until you
              save a report or close the tab. They are not automatically persisted to the server.
            </p>
          </Card>
        </div>
      </div>

      {/* ── What is not stored ── */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-3">What is not stored</h2>
        <Card padding="sm">
          <ul className="space-y-2">
            {[
              "Raw CSV files — parsed in your browser only",
              "Raw screenshots — not stored by this app after extraction",
              "Brokerage login credentials",
              "Bank account connections",
              "Trading instructions",
              "Personal identifiable information",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="text-teal-500 shrink-0 mt-0.5">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-400 mt-3 leading-relaxed">
            Screenshots are sent to the AI provider for holdings extraction. They are not stored
            by this app. Do not upload screenshots containing account numbers, addresses, or other
            personal information.
          </p>
        </Card>
      </div>

      {/* ── Delete data ── */}
      <div className="mb-6">
        <h2 className="text-base font-semibold text-slate-800 mb-1">Delete saved data</h2>
        <p className="text-sm text-slate-500 mb-4">
          These actions remove data stored under your current browser session.
        </p>
        <div className="space-y-3">
          {DELETE_ACTIONS.map((action) => {
            const s = getState(action.id);
            return (
              <Card key={action.id} padding="sm">
                <p className="text-sm font-semibold text-slate-700 mb-0.5">{action.label}</p>
                <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                  {action.description}
                </p>

                {s === "idle" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setState(action.id, "confirming")}
                  >
                    Delete
                  </Button>
                )}

                {s === "confirming" && (
                  <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-3">
                    <p className="text-xs text-rose-700 mb-3 leading-relaxed">
                      {action.confirmMsg}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => runDelete(action.id)}
                        className="bg-rose-600 hover:bg-rose-700 border-rose-600"
                      >
                        Confirm delete
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setState(action.id, "idle")}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {s === "deleting" && (
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-400 border-t-transparent animate-spin shrink-0" />
                    Deleting…
                  </div>
                )}

                {s === "done" && (
                  <p className="text-xs text-teal-600 font-medium">Deleted successfully.</p>
                )}

                {s === "error" && (
                  <div>
                    <p className="text-xs text-rose-500 mb-2">
                      Something went wrong. Please try again.
                    </p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setState(action.id, "idle")}
                    >
                      Retry
                    </Button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <Disclaimer extended="Educational only. Not financial advice. This app does not place trades, connect to brokerage accounts, or provide personalized investment recommendations." />
    </PageLayout>
  );
}
