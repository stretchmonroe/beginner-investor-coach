import type { Profile } from "@/lib/etfs";
import Button from "@/components/ui/Button";

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
    description: "I want to reduce volatility and keep things easier to handle emotionally.",
    cardStyle: "border-violet-200 bg-violet-50 hover:border-violet-300 hover:shadow-sm",
    badgeStyle: "bg-violet-100 text-violet-700",
  },
  {
    label: "Balanced Beginner",
    badge: "⚖️",
    description: "I want a mix of growth and stability.",
    cardStyle: "border-blue-200 bg-blue-50 hover:border-blue-300 hover:shadow-sm",
    badgeStyle: "bg-blue-100 text-blue-700",
  },
  {
    label: "Growth Beginner",
    badge: "📈",
    description: "I have a longer timeline and can handle larger market swings.",
    cardStyle: "border-emerald-200 bg-emerald-50 hover:border-emerald-300 hover:shadow-sm",
    badgeStyle: "bg-emerald-100 text-emerald-700",
  },
];

const HOW_IT_WORKS = [
  {
    step: "1",
    label: "Add or upload holdings",
    detail: "Enter manually, import a CSV, or upload a screenshot.",
  },
  {
    step: "2",
    label: "Explore concentration and exposure",
    detail: "The app estimates sector, geography, and overlap using simplified metadata.",
  },
  {
    step: "3",
    label: "Ask AI Portfolio Coach",
    detail: "Get plain-English explanations without jargon or buy/sell pressure.",
  },
  {
    step: "4",
    label: "Save reports and compare over time",
    detail: "Snapshots are stored locally to your session — no account needed.",
  },
];

export default function Landing({ onSelectProfile, onSamplePortfolio }: Props) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <div className="max-w-xl w-full text-center space-y-8">

        {/* Logo mark */}
        <div className="flex justify-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-md">
            <span className="text-white text-2xl font-bold">B</span>
          </div>
        </div>

        {/* Headline */}
        <div className="space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            AI Portfolio Coach
          </h1>
          <p className="text-xl text-slate-600 font-medium">
            For Canadian beginner investors
          </p>
        </div>

        {/* Description */}
        <p className="text-slate-500 leading-relaxed text-base">
          Know what you own, what you&apos;re exposed to, and what to consider next — without
          pretending to be a day trader.
        </p>

        {/* Profile picker */}
        <div className="text-left space-y-3">
          <p className="text-sm font-semibold text-slate-500 text-center uppercase tracking-widest">
            Pick your style to get started
          </p>
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

        {/* Sample portfolio */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-slate-100" />
            <span className="text-xs text-slate-400">or</span>
            <div className="flex-1 h-px bg-slate-100" />
          </div>
          <Button
            variant="secondary"
            onClick={onSamplePortfolio}
            size="lg"
            className="w-full sm:w-auto px-8"
          >
            Try sample portfolio
          </Button>
        </div>

        {/* Trust note */}
        <p className="text-xs text-slate-400">
          No account needed · Educational only · Not financial advice
        </p>

        {/* How it works */}
        <div className="border-t border-slate-100 pt-8 text-left">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest text-center mb-5">
            How Portfolio X-Ray works
          </p>
          <div className="space-y-4">
            {HOW_IT_WORKS.map((item) => (
              <div key={item.step} className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700">{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center mt-5">
            Educational only. Not financial advice. Simplified exposure estimates.
          </p>
        </div>

      </div>
    </main>
  );
}
