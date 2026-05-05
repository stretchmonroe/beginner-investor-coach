interface Props {
  icon: string;
  title: string;
  description: string;
  badge?: string;
  actionLabel?: string;
  onClick: () => void;
}

export default function ToolCard({ icon, title, description, badge, actionLabel, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="bg-white border border-slate-100 rounded-2xl p-4 hover:border-blue-200 hover:shadow-sm transition-all cursor-pointer text-left w-full"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xl text-slate-500 leading-none">{icon}</span>
        {badge && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 shrink-0">
            {badge}
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-slate-800 leading-snug mb-0.5">{title}</p>
      <p className="text-xs text-slate-400 leading-relaxed">{description}</p>
      {actionLabel && (
        <p className="text-xs font-medium text-blue-600 mt-2">{actionLabel} →</p>
      )}
    </button>
  );
}
