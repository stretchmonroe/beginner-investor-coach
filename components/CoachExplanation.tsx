import type { CoachContent } from "@/lib/coachExplanations";

interface Props {
  content: CoachContent;
  onClose: () => void;
}

export default function CoachExplanation({ content, onClose }: Props) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-emerald-100 border-b border-emerald-200">
        <div className="flex items-center gap-2">
          <span className="text-emerald-600 text-sm">✦</span>
          <span className="text-xs font-semibold text-emerald-700 uppercase tracking-widest">
            Beginner Coach
          </span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close explanation"
          className="text-emerald-500 hover:text-emerald-700 transition-colors cursor-pointer text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Explanation */}
        <p className="text-sm text-slate-700 leading-relaxed">{content.explanation}</p>

        {/* Key takeaway */}
        <div className="border-l-4 border-emerald-400 pl-4 py-1">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-widest mb-1">
            Key takeaway
          </p>
          <p className="text-sm text-emerald-900 leading-relaxed">{content.keyTakeaway}</p>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-slate-400 leading-relaxed">
          Educational only. Not financial advice.
        </p>
      </div>
    </div>
  );
}
