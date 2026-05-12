"use client";

import { useEffect } from "react";
import PageLayout from "@/components/ui/PageLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Disclaimer from "@/components/ui/Disclaimer";
import SectionHeader from "@/components/ui/SectionHeader";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { trackEvent } from "@/lib/analytics";

interface Props {
  onBack: () => void;
  onContinue?: () => void;
}

const BENEFITS = [
  "CSV portfolio import",
  "Screenshot holdings extraction",
  "Unlimited Portfolio Reports",
  "PDF export from the report view",
  "Portfolio comparison over time",
  "Expanded AI explanations",
  "Advanced overlap insights",
] as const;

export default function PremiumPortfolioTools({ onBack, onContinue }: Props) {
  const { isPremium, setTier } = useSubscription();

  useEffect(() => {
    trackEvent("premium_page_viewed");
  }, []);

  return (
    <PageLayout maxWidth="md">
      <PageHeader
        eyebrow="Premium Portfolio Tools"
        title="Advanced Portfolio Insights"
        description="Know what you own, what you’re exposed to, and what to consider next — without pretending to be a day trader. Premium adds deeper portfolio workflows when you’re ready."
        action={
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
        }
      />

      {isPremium && (
        <div className="mb-4">
          <Badge variant="info">Premium preview enabled on this device</Badge>
        </div>
      )}

      <SectionHeader
        title="What Premium includes"
        description="Educational tools only. Not financial advice. No trading or brokerage connections."
      />

      <Card className="mb-6">
        <ul className="space-y-3 text-sm text-slate-700">
          {BENEFITS.map((line) => (
            <li key={line} className="flex gap-2">
              <span className="text-teal-600 font-semibold shrink-0">✓</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <Button disabled className="opacity-80 cursor-not-allowed">
          Coming soon
        </Button>
        <Button variant="secondary" onClick={onBack}>
          Back to dashboard
        </Button>
      </div>

      <Card variant="muted" className="mb-6">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
          Local preview (development)
        </p>
        <p className="text-sm text-slate-600 mb-3">
          Billing is not connected yet. You can toggle Premium on this browser only to test gates and
          limits.
        </p>
        <div className="flex flex-wrap gap-2">
          {!isPremium ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setTier("premium");
                onContinue?.();
              }}
            >
              Enable Premium preview (this device)
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
