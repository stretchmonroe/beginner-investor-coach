"use client";

import PageLayout from "@/components/ui/PageLayout";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

interface Props {
  onBack: () => void;
}

export default function PortfolioXRay({ onBack }: Props) {
  return (
    <PageLayout maxWidth="sm">
      <PageHeader
        title="Portfolio X-Ray"
        action={
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← Back
          </Button>
        }
      />
      <Card>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Coming soon</p>
        <h2 className="text-base font-semibold text-slate-800 mb-2">Understand what you own</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Paste your holdings and get an instant plain-English breakdown — asset mix,
          overlap, fees, and what it all means for a Canadian beginner investor.
        </p>
      </Card>
    </PageLayout>
  );
}
