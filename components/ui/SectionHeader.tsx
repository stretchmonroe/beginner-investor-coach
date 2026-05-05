interface Props {
  title: string;
  description?: string;
  className?: string;
}

export default function SectionHeader({ title, description, className = "" }: Props) {
  return (
    <div className={`mb-4 space-y-1 ${className}`}>
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
      {description && (
        <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
      )}
    </div>
  );
}
