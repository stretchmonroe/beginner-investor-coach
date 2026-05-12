import type { Metadata } from "next";
import "./globals.css";
import AppProviders from "@/components/AppProviders";
import { PostHogProvider } from '@/components/PostHogProvider'

export const metadata: Metadata = {
  title: "AI Portfolio Coach · Canadian beginners",
  description:
    "Know what you own, what you’re exposed to, and what to consider next — without pretending to be a day trader.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <PostHogProvider>
          <AppProviders>{children}</AppProviders>
        </PostHogProvider>
      </body>
    </html>
  );
}
