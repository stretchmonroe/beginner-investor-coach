import type { ReactNode } from "react";

type Variant = "default" | "success" | "caution" | "danger" | "info" | "muted";

interface Props {
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-green-100 text-green-700",
  caution: "bg-amber-100 text-amber-700",
  danger: "bg-rose-100 text-rose-700",
  info: "bg-blue-100 text-blue-700",
  muted: "bg-slate-50 text-slate-500 border border-slate-200",
};

export default function Badge({ children, variant = "default", className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
