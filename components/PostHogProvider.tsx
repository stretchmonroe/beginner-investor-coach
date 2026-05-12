"use client";

import posthog from "posthog-js";
import { useEffect } from "react";
import type { ReactNode } from "react";

export default function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key) return;

    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com",
      // Only track events we explicitly call — no automatic clicks, forms, etc.
      autocapture: false,
      capture_pageview: false,
      capture_pageleave: false,
      // No session recordings
      disable_session_recording: true,
      persistence: "localStorage",
    });
  }, []);

  return <>{children}</>;
}
