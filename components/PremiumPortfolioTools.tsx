"use client";

import { useEffect } from "react";
import PageLayout from "@/components/ui/PageLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Disclaimer from "@/components/ui/Disclaimer";
import SectionHeader from "@/components/ui/SectionHeader";
import SubscriptionStatus from "@/components/SubscriptionStatus";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { trackEvent } from "@/lib/analytics";

interface Props {
  onBack: () => void;
  onContinue?: () => void;
}

const BENEFITS = [
  { label: "CSV portfolio import", detail: "Paste a spreadsheet export from your brokerage" },
  { label: "Screenshot holdings extraction", detail: "Upload a screenshot and let AI read your positions" },
  { label: "Unlimited Portfolio Reports", detail: "Save and revisit as many snapshots as you want" },
  { label: "PDF export", detail: "Download any report as a clean PDF" },
  { label: "Portfolio comparison over time", detail: "Compare two saved snapshots to see what changed" },
  { label: "Expanded AI explanations", detail: "Deeper context when asking the AI Portfolio Coach" },
  { label: "Advanced overlap insights", detail: "See which holdings duplicate each other across ETFs" },
] as const;

export default function PremiumPortfolioTools({ onBack, onContinue }: Props) {
  const { isPremium, setTier, openCheckout, openPortal, loading } = useSubscription();

  useEffect(() => {
    trackEvent("premium_page_viewed");
  }, []);

  return (
    <PageLayout maxWidth="md">
      <PageHeader
        eyebrow="Premium Portfolio Tools"
        title="Advanced Portfolio Insights"
        description="Know what you own, what you're exposed to, and what to consider next — without pretending to be a day trader."
        action={
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
        }
      />

      <div className="mb-5">
        <SubscriptionStatus showManage />
      </div>

      <SectionHeader
        title="What Premium includes"
        description="Educational tools only. Not financial advice. No trading or brokerage connections."
      />

      <Card className="mb-6">
        <ul className="space-y-3.5">
          {BENEFITS.map(({ label, detail }) => (
            <li key={label} className="flex gap-2.5">
              <span className="text-teal-600 font-semibold shrink-0 mt-0.5">✓</span>
              <div>
                <p className="text-sm font-medium text-slate-800">{label}</p>
                <p className="text-xs text-slate-500">{detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      {process.env.NEXT_PUBLIC_BETA_MODE === "true" ? (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-semibold text-amber-800">
              Beta access — all features unlocked
            </p>
            <p className="text-xs text-slate-600">
              You have full access to every feature during the beta period. Paid plans will be introduced after beta.
            </p>
            {process.env.NEXT_PUBLIC_FEEDBACK_URL && (
              <a
                href={process.env.NEXT_PUBLIC_FEEDBACK_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-amber-700 underline underline-offset-2 hover:text-amber-900 transition-colors mt-1 w-fit"
              >
                Share feedback →
              </a>
            )}
          </div>
        </Card>
      ) : !isPremium ? (
        <Card className="mb-6 border-teal-200 bg-teal-50">
          <div className="flex flex-col gap-3">
            <div>
              <p className="text-sm font-semibold text-teal-800 mb-0.5">
                Premium Portfolio Tools — CAD $12 / month
              </p>
              <p className="text-xs text-slate-600">
                Cancel anytime. Billed monthly. Secure payment via Stripe.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={openCheckout} disabled={loading}>
                {loading ? "Loading…" : "Upgrade to Premium"}
              </Button>
              <Button variant="secondary" onClick={onBack}>
                Maybe later
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="mb-6 border-teal-200 bg-teal-50">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-teal-800">
              You have Premium Portfolio Tools.
            </p>
            <p className="text-xs text-slate-600">
              All features are unlocked on this device.
            </p>
            <div className="flex flex-wrap gap-2 mt-1">
              <Button onClick={openPortal} variant="secondary" size="sm" disabled={loading}>
                {loading ? "Loading…" : "Manage billing"}
              </Button>
              {onContinue && (
                <Button size="sm" onClick={onContinue}>
                  Continue to Portfolio X-Ray
                </Button>
              )}
            </div>
          </div>
        </Card>
      )}

      <div className="mb-8">
        <Button variant="secondary" onClick={onBack}>
          Back to dashboard
        </Button>
      </div>

      <Card variant="muted" className="mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">
          Local preview (development only)
        </p>
        <p className="text-xs text-slate-500 mb-3">
          Toggle tier for UI testing without going through Stripe.
        </p>
        <div className="flex flex-wrap gap-2">
          {!isPremium ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => { setTier("premium"); onContinue?.(); }}
            >
              Enable Premium (this device)
            </Button>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setTier("free")}>
              Switch back to Free
            </Button>
          )}
        </div>
      </Card>

      <Disclaimer extended="Premium Portfolio Tools are for learning and organization. They do not predict returns, beat the market, or replace a licensed financial advisor." />
    </PageLayout>
  );
}
