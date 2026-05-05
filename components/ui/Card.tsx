import type { ReactNode, MouseEventHandler } from "react";

type Padding = "sm" | "md" | "lg";
type Variant = "default" | "muted" | "highlighted";

interface Props {
  children: ReactNode;
  padding?: Padding;
  variant?: Variant;
  hover?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
  className?: string;
}

const paddingMap: Record<Padding, string> = {
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

const variantMap: Record<Variant, string> = {
  default: "bg-white border border-slate-100 shadow-sm",
  muted: "bg-slate-50 border border-slate-100",
  highlighted: "bg-blue-50 border border-blue-100",
};

export default function Card({ children, padding = "md", variant = "default", hover = false, onClick, className = "" }: Props) {
  const base = `rounded-2xl ${variantMap[variant]} ${paddingMap[padding]}`;
  const hoverClass = hover ? "hover:border-blue-200 hover:shadow-md transition-all cursor-pointer" : "";
  const combined = `${base} ${hoverClass} ${className}`;

  if (onClick) {
    return (
      <button onClick={onClick} className={`${combined} w-full text-left`}>
        {children}
      </button>
    );
  }

  return <div className={combined}>{children}</div>;
}
