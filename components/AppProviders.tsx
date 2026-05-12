"use client";

import type { ReactNode } from "react";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import PostHogProvider from "@/components/PostHogProvider";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <PostHogProvider>
      <SubscriptionProvider>{children}</SubscriptionProvider>
    </PostHogProvider>
  );
}
