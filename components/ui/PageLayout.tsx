import type { ReactNode } from "react";

type MaxWidth = "sm" | "md" | "lg" | "xl" | "2xl";

interface Props {
  children: ReactNode;
  maxWidth?: MaxWidth;
  className?: string;
}

const maxWidthMap: Record<MaxWidth, string> = {
  sm: "max-w-2xl",
  md: "max-w-3xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
  "2xl": "max-w-6xl",
};

export default function PageLayout({ children, maxWidth = "xl", className = "" }: Props) {
  return (
    <main className={`min-h-screen px-4 py-10 sm:px-6 sm:py-16 ${maxWidthMap[maxWidth]} mx-auto ${className}`}>
      {children}
    </main>
  );
}
