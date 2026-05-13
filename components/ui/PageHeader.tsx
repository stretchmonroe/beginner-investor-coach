import type { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
}

export default function PageHeader({ title, description, eyebrow, action }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 mb-8 sm:mb-10">
      <div className="space-y-1.5 min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description && (
          <p className="text-sm sm:text-base text-slate-500 leading-relaxed max-w-xl mt-1">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0 pt-1">{action}</div>}
    </div>
  );
}
