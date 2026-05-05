import Button from "@/components/ui/Button";

interface Props {
  onStart: () => void;
  onSkipQuiz: () => void;
}

export default function Landing({ onStart, onSkipQuiz }: Props) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
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
            Beginner Investor Coach
          </h1>
          <p className="text-xl text-slate-600 font-medium">
            Learn how to start investing with confidence
          </p>
        </div>

        {/* Description */}
        <p className="text-slate-500 leading-relaxed text-base">
          Not sure where to begin? This free tool helps you understand ETFs,
          mutual funds, risk tolerance, and long-term investing — in plain
          English. No jargon. No pressure. Just clear, beginner-friendly
          guidance.
        </p>

        {/* CTA */}
        <div className="space-y-3">
          <Button onClick={onStart} size="lg" className="shadow-sm px-8 text-base">
            Start beginner quiz
          </Button>

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
          5 quick questions · No account needed · Educational only
        </p>
      </div>
    </main>
  );
}
