interface Props {
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ title, description, action }: Props) {
  return (
    <div className="py-12 flex flex-col items-center justify-center text-center gap-2">
      <p className="text-sm font-semibold text-slate-600">{title}</p>
      <p className="text-sm text-slate-400 leading-relaxed max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-2 text-sm font-semibold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
        >
          {action.label} →
        </button>
      )}
    </div>
  );
}
