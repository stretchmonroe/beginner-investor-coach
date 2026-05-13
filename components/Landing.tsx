"use client";

import { useRef } from "react";
import type { Profile } from "@/lib/etfs";

interface Props {
  onSelectProfile: (profile: Profile) => void;
  onSamplePortfolio: () => void;
}

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
    description: "I prefer stability and want to keep things emotionally manageable.",
    cardStyle: "border-violet-200 bg-violet-50 hover:border-violet-300",
    badgeStyle: "bg-violet-100 text-violet-700",
  },
  {
    label: "Balanced Beginner",
    badge: "⚖️",
    description: "I want a mix of growth and stability — still learning what that means.",
    cardStyle: "border-blue-200 bg-blue-50 hover:border-blue-300",
    badgeStyle: "bg-blue-100 text-blue-700",
  },
  {
    label: "Growth Beginner",
    badge: "📈",
    description: "I have a longer timeline and can sit with more market movement.",
    cardStyle: "border-teal-200 bg-teal-50 hover:border-teal-300",
    badgeStyle: "bg-teal-100 text-teal-700",
  },
];

const STEPS = [
  {
    number: "1",
    title: "Add your portfolio",
    detail: "Upload a screenshot, import a CSV, or enter holdings manually.",
  },
  {
    number: "2",
    title: "See hidden overlap and exposure",
    detail: "Understand concentration, sector exposure, and ETF overlap.",
  },
  {
    number: "3",
    title: "Get plain-English insights",
    detail: "Lantern explains what stands out — without trading jargon or financial advice.",
  },
];

const PREVIEW_INSIGHTS = [
  "Your portfolio may be more concentrated in U.S. technology than it appears.",
  "Several of your ETFs hold many of the same companies.",
  "A large portion of your holdings depend on similar market conditions.",
];

const TRUST_POINTS = [
  { icon: "🔒", label: "No brokerage connection required" },
  { icon: "🛡️", label: "Your portfolio stays private" },
  { icon: "🎓", label: "Educational insights only" },
  { icon: "🇨🇦", label: "Built for Canadian beginners" },
];

export default function Landing({ onSelectProfile, onSamplePortfolio }: Props) {
  const profileRef = useRef<HTMLDivElement>(null);

  function scrollToProfiles() {
    profileRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="min-h-screen bg-white text-slate-900">

      {/* ── Hero ── */}
      <section className="flex flex-col items-center text-center px-5 pt-16 pb-20 sm:pt-24 sm:pb-28">

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-10">
          <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center shadow-sm">
            <span className="text-white text-lg leading-none">🪔</span>
          </div>
          <span className="text-xl font-bold tracking-tight text-slate-900">Lantern</span>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.1]">
            Understand what you<br className="hidden sm:block" /> actually own.
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 leading-relaxed max-w-lg mx-auto">
            See portfolio overlap, concentration, and exposure explained in plain English.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              onClick={scrollToProfiles}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Explore My Portfolio
            </button>
            <button
              onClick={onSamplePortfolio}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Try Sample Portfolio
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Educational insights for beginner investors. Not financial advice.
          </p>
        </div>
      </section>

      {/* ── How Lantern works ── */}
      <section className="bg-slate-50 px-5 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest text-center mb-10">
            How Lantern works
          </p>
          <div className="space-y-10">
            {STEPS.map((step) => (
              <div key={step.number} className="flex gap-5 items-start">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step.number}
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-800 mb-1">{step.title}</p>
                  <p className="text-sm text-slate-500 leading-relaxed">{step.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Preview insights ── */}
      <section className="px-5 py-16 sm:py-20">
        <div className="max-w-2xl mx-auto">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest text-center mb-3">
            Example insights
          </p>
          <p className="text-center text-slate-500 text-sm mb-8">
            Here&apos;s the kind of thing Lantern surfaces about a typical beginner portfolio.
          </p>
          <div>
            {PREVIEW_INSIGHTS.map((insight, i) => (
              <div
                key={i}
                className="flex gap-3 items-start py-4 border-b border-slate-100 last:border-0"
              >
                <span className="text-amber-400 text-sm mt-0.5 shrink-0">🪔</span>
                <p className="text-sm text-slate-600 leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust points ── */}
      <section className="bg-slate-50 px-5 py-14 sm:py-16">
        <div className="max-w-2xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {TRUST_POINTS.map((point) => (
              <div key={point.label} className="flex flex-col items-center text-center gap-2">
                <span className="text-2xl">{point.icon}</span>
                <p className="text-xs text-slate-500 leading-snug font-medium">{point.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Profile picker ── */}
      <section ref={profileRef} className="px-5 py-16 sm:py-20 scroll-mt-6">
        <div className="max-w-lg mx-auto">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest text-center mb-2">
            Get started
          </p>
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-2">
            Choose your investor style
          </h2>
          <p className="text-sm text-slate-500 text-center mb-8">
            Lantern tailors its explanations to your comfort level. There are no wrong answers — you can change this anytime.
          </p>
          <div className="space-y-3">
            {PROFILES.map((p) => (
              <button
                key={p.label}
                onClick={() => onSelectProfile(p.label)}
                className={`w-full text-left rounded-2xl border p-4 flex items-center gap-4 transition-all cursor-pointer ${p.cardStyle}`}
              >
                <span
                  className={`inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-full shrink-0 ${p.badgeStyle}`}
                >
                  <span>{p.badge}</span>
                  <span className="hidden sm:inline">{p.label}</span>
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800 sm:hidden mb-0.5">{p.label}</p>
                  <p className="text-sm text-slate-600 leading-snug">{p.description}</p>
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center mt-6">
            No account needed · No trading required · Not financial advice
          </p>
        </div>
      </section>

    </main>
  );
}
