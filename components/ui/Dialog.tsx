"use client";

import { useEffect, useId } from "react";
import Button from "@/components/ui/Button";

interface Props {
  open: boolean;
  title: string;
  description?: string;
  children?: React.ReactNode;
  onClose: () => void;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
}

export default function Dialog({
  open,
  title,
  description,
  children,
  onClose,
  primaryLabel = "OK",
  onPrimary,
  secondaryLabel,
  onSecondary,
}: Props) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 cursor-default border-0 w-full h-full"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full border border-slate-200 p-6 z-10 text-left">
        <h2 id={titleId} className="text-lg font-semibold text-slate-900 mb-2">
          {title}
        </h2>
        {description && (
          <p className="text-sm text-slate-600 leading-relaxed mb-3">{description}</p>
        )}
        {children && <div className="text-sm text-slate-600 leading-relaxed mb-6">{children}</div>}
        <div className="flex flex-wrap gap-2 justify-end">
          {secondaryLabel && (
            <Button
              variant="ghost"
              onClick={() => {
                onSecondary?.();
                onClose();
              }}
            >
              {secondaryLabel}
            </Button>
          )}
          <Button
            onClick={() => {
              onPrimary?.();
              onClose();
            }}
          >
            {primaryLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
