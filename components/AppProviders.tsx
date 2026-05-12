"use client";

import type { ReactNode } from "react";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";

export default function AppProviders({ children }: { children: ReactNode }) {
  return <SubscriptionProvider>{children}</SubscriptionProvider>;
}
