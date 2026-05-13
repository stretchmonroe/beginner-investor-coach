interface Props {
  title: string;
  description?: string;
  className?: string;
}

export default function SectionHeader({ title, description, className = "" }: Props) {
  return (
    <div className={`mb-5 space-y-1.5 ${className}`}>
      <h2 className="text-base font-semibold text-slate-800 tracking-tight">{title}</h2>
      {description && (
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      )}
    </div>
  );
}
