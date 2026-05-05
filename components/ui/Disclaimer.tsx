interface Props {
  extended?: string;
}

export default function Disclaimer({ extended }: Props) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 px-5 py-4">
      <p className="text-xs text-slate-500 leading-relaxed">
        <span className="font-medium text-slate-600">Educational only. Not financial advice.</span>
        {extended && <> {extended}</>}
      </p>
    </div>
  );
}
