import type { Metadata } from "next";
import "./globals.css";
import AppProviders from "@/components/AppProviders";
import { PostHogProvider } from '@/components/PostHogProvider'

export const metadata: Metadata = {
  title: "Lantern — Understand what you actually own",
  description:
    "See portfolio overlap, concentration, and exposure explained in plain English. Educational insights for beginner investors.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900 antialiased">
        <PostHogProvider>
          <AppProviders>{children}</AppProviders>
        </PostHogProvider>
      </body>
    </html>
  );
}
