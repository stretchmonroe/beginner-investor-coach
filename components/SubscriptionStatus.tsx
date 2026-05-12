"use client";

import { useSubscription } from "@/contexts/SubscriptionContext";

interface Props {
  /** Show the manage billing link (only relevant for premium users) */
  showManage?: boolean;
}

export default function SubscriptionStatus({ showManage = true }: Props) {
  const { isPremium, loading, openPortal } = useSubscription();

  if (loading) {
    return <span className="text-xs text-slate-400">Checking plan…</span>;
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span
        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
          isPremium
            ? "bg-teal-50 text-teal-700 border border-teal-200"
            : "bg-slate-100 text-slate-500 border border-slate-200"
        }`}
      >
        {isPremium ? "✓ Premium" : "Free plan"}
      </span>
      {isPremium && showManage && (
        <button
          onClick={openPortal}
          className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-700 transition-colors"
        >
          Manage billing
        </button>
      )}
    </div>
  );
}
