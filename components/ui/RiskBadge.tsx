export type RiskLevel = "Low" | "Medium" | "Medium-high" | "High";

interface Props {
  level: RiskLevel;
}

const styles: Record<RiskLevel, string> = {
  Low: "bg-green-100 text-green-700",
  Medium: "bg-amber-100 text-amber-800",
  "Medium-high": "bg-orange-100 text-orange-800",
  High: "bg-rose-100 text-rose-700",
};

export default function RiskBadge({ level }: Props) {
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${styles[level]}`}>
      {level} risk
    </span>
  );
}
