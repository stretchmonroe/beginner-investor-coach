interface Props {
  extended?: string;
}

export default function Disclaimer({ extended }: Props) {
  return (
    <div className="border-t border-slate-100 pt-5 mt-4">
      <p className="text-xs text-slate-400 leading-relaxed">
        Educational only. Not financial advice.
        {extended && <> {extended}</>}
      </p>
    </div>
  );
}
