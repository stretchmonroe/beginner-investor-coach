import type { ReactNode, MouseEventHandler } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

interface Props {
  children: ReactNode;
  variant?: Variant;
  size?: Size;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-semibold border border-transparent disabled:opacity-40 disabled:cursor-not-allowed",
  secondary:
    "bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 font-medium border border-slate-200 hover:border-slate-300",
  ghost:
    "bg-transparent hover:bg-slate-100 text-slate-500 hover:text-slate-700 font-medium border border-transparent",
};

const sizeStyles: Record<Size, string> = {
  sm: "text-xs px-3 py-2 rounded-lg min-h-[36px]",
  md: "text-sm px-5 py-2.5 rounded-xl min-h-[44px]",
  lg: "text-sm px-6 py-3.5 rounded-xl min-h-[48px]",
};

export default function Button({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled = false,
  type = "button",
  className = "",
  fullWidth = false,
}: Props) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-1.5 select-none transition-colors cursor-pointer touch-manipulation ${variantStyles[variant]} ${sizeStyles[size]} ${fullWidth ? "w-full" : ""} ${className}`}
    >
      {children}
    </button>
  );
}
