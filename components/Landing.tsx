import Button from "@/components/ui/Button";

interface Props {
  onStart: () => void;
  onSkipQuiz: () => void;
  onSamplePortfolio: () => void;
}

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

export default function Landing({ onStart, onSkipQuiz, onSamplePortfolio }: Props) {
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
          Know what you own, what you&apos;re exposed to, and what to consider next — without pretending
          to be a day trader. Explore concentration, overlap, and exposure in plain English.
        </p>

        {/* CTAs */}
        <div className="space-y-3">
          <Button onClick={onStart} size="lg" className="shadow-sm px-8 text-base w-full sm:w-auto">
            Start beginner quiz
          </Button>
          <div>
            <Button
              variant="secondary"
              onClick={onSamplePortfolio}
              size="lg"
              className="px-8 text-base w-full sm:w-auto"
            >
              Try sample portfolio
            </Button>
          </div>
          <p className="text-sm text-slate-400">
            Already know your style?{" "}
            <button
              onClick={onSkipQuiz}
              className="text-slate-500 hover:text-slate-700 underline transition-colors cursor-pointer"
            >
              Skip quiz
            </button>
          </p>
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
