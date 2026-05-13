"use client";

import type { Profile } from "@/lib/etfs";

const PROFILES: {
  label: Profile;
  badge: string;
  description: string;
  cardStyle: string;
  badgeStyle: string;
}[] = [
  {
    label: "Conservative Beginner",
    badge: "🛡️",
    description:
      "I want to reduce volatility and keep things easier to handle emotionally.",
    cardStyle: "border-violet-200 bg-violet-50 hover:border-violet-300",
    badgeStyle: "bg-violet-100 text-violet-700",
  },
  {
    label: "Balanced Beginner",
    badge: "⚖️",
    description: "I want a mix of growth and stability.",
    cardStyle: "border-blue-200 bg-blue-50 hover:border-blue-300",
    badgeStyle: "bg-blue-100 text-blue-700",
  },
  {
    label: "Growth Beginner",
    badge: "📈",
    description:
      "I have a longer timeline and can handle larger market swings.",
    cardStyle: "border-emerald-200 bg-emerald-50 hover:border-emerald-300",
    badgeStyle: "bg-emerald-100 text-emerald-700",
  },
];

interface Props {
  onSelect: (profile: Profile) => void;
  onBack: () => void;
}

export default function ProfileSelection({ onSelect, onBack }: Props) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
      <div className="max-w-lg w-full space-y-8">
        {/* Back */}
        <button
          onClick={onBack}
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          ← Back
        </button>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">
            Choose your investor profile
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Select the profile that best describes your mindset. You can adjust this at any time inside the tools.
          </p>
        </div>

        {/* Profile cards */}
        <div className="space-y-4">
          {PROFILES.map((p) => (
            <button
              key={p.label}
              onClick={() => onSelect(p.label)}
              className={`w-full text-left rounded-2xl border p-5 space-y-3 transition-colors cursor-pointer ${p.cardStyle}`}
            >
              <div className={`inline-flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-full ${p.badgeStyle}`}>
                <span>{p.badge}</span>
                <span>{p.label}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                {p.description}
              </p>
            </button>
          ))}
        </div>

        <p className="text-xs text-slate-400 text-center">
          You can change this at any time from the dashboard.
        </p>
      </div>
    </main>
  );
}
