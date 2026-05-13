"use client";

import type { ReactNode } from "react";
import { SubscriptionProvider } from "@/contexts/SubscriptionContext";
import { AuthProvider } from "@/contexts/AuthContext";

export default function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SubscriptionProvider>
      <AuthProvider>{children}</AuthProvider>
    </SubscriptionProvider>
  );
}
