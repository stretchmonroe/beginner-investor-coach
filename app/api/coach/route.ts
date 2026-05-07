import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { PortfolioContext } from "@/types/portfolio";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASE_SYSTEM_PROMPT = `You are an AI Portfolio Coach for Canadian beginner investors. Your job is to explain portfolio holdings, concentration, exposure, overlap, contribution scenarios, and investing concepts in plain English. You help users understand what they own and what risks or assumptions may be worth paying attention to.

You do not provide personalized financial advice, buy/sell recommendations, guaranteed outcomes, or specific instructions to purchase or sell any security. If a user asks "should I buy X?", "should I sell Y?", "what stock should I buy?", "is my portfolio good or bad?", "what's the best ETF?", or "tell me exactly what to do", politely redirect them toward understanding concepts like concentration risk, overlap, diversification, time horizon, fees, and contribution planning. Always suggest consulting a licensed financial advisor for personalized advice.

The app covers Canadian beginner investing topics including ETFs (XEQT, VEQT, VGRO, VBAL, VFV, XUU, CASH), sector/geography/currency exposure, overlap, concentration, contribution scenarios, and goal planning.

When explaining portfolio holdings, use cautious language such as "may," "appears to," "based on the holdings entered," and "worth understanding." Always note that exposure mappings are simplified estimates and may not reflect current fund holdings, fees, or real-time data.

Respond in this exact format:
**Simple explanation:** [1-2 sentences in plain English]
**What the numbers suggest:** [2-3 sentences explaining the numbers in context]
**What to pay attention to:** [2-3 sentences on key assumptions, risks, or caveats]
**Questions to consider:** [2-3 beginner-friendly questions the user could explore further]
**Remember:** Educational only. Not financial advice. Speak with a licensed financial advisor for personalized guidance.`;

function formatPortfolioContext(ctx: PortfolioContext): string {
  const lines: string[] = ["PORTFOLIO CONTEXT (from the user's Portfolio X-Ray — use this to explain, not to advise):"];

  if (ctx.reportName) lines.push(`Report name: ${ctx.reportName}`);
  if (ctx.savedAt) lines.push(`Saved: ${ctx.savedAt}`);
  if (ctx.totalValue != null) {
    lines.push(`Total portfolio value: $${ctx.totalValue.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${ctx.currency ?? "CAD"}`);
  }

  if (ctx.holdings && ctx.holdings.length > 0) {
    const holdingList = ctx.holdings
      .map((h) => `${h.ticker || h.name} (${h.weight.toFixed(1)}%, $${h.marketValue.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}, ${h.assetType})`)
      .join("; ");
    lines.push(`Holdings (${ctx.holdings.length}): ${holdingList}`);
  }

  if (ctx.largestHolding) {
    lines.push(`Largest holding: ${ctx.largestHolding.label} at ${ctx.largestHolding.weight.toFixed(1)}%`);
  }
  if (ctx.top3Weight != null) {
    lines.push(`Top 3 holdings combined: ${ctx.top3Weight.toFixed(1)}%`);
  }

  if (ctx.assetMix && ctx.assetMix.length > 0) {
    lines.push(`Asset type mix: ${ctx.assetMix.map((m) => `${m.assetType} ${m.weight.toFixed(1)}%`).join(", ")}`);
  }
  if (ctx.sectorExposure && ctx.sectorExposure.length > 0) {
    lines.push(`Sector exposure (estimated): ${ctx.sectorExposure.slice(0, 5).map((s) => `${s.label} ${s.weight.toFixed(1)}%`).join(", ")}`);
  }
  if (ctx.geographyExposure && ctx.geographyExposure.length > 0) {
    lines.push(`Geography exposure (estimated): ${ctx.geographyExposure.slice(0, 5).map((g) => `${g.label} ${g.weight.toFixed(1)}%`).join(", ")}`);
  }
  if (ctx.currencyExposure && ctx.currencyExposure.length > 0) {
    lines.push(`Currency exposure (estimated): ${ctx.currencyExposure.map((c) => `${c.label} ${c.weight.toFixed(1)}%`).join(", ")}`);
  }

  if (ctx.concentrationInsights && ctx.concentrationInsights.length > 0) {
    lines.push(`Concentration notes: ${ctx.concentrationInsights.map((i) => i.title).join("; ")}`);
  }
  if (ctx.overlapInsights && ctx.overlapInsights.length > 0) {
    lines.push(`Overlap notes: ${ctx.overlapInsights.map((i) => i.title).join("; ")}`);
  }
  if (ctx.themeInsights && ctx.themeInsights.length > 0) {
    lines.push(`Theme notes: ${ctx.themeInsights.map((i) => i.title).join("; ")}`);
  }

  lines.push("Note: exposure estimates use simplified static metadata and may not reflect current fund holdings or fees.");
  return lines.join("\n");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, profile, watchedTickers, readinessContext, portfolioContext } = body as {
      question: string;
      profile?: string | null;
      watchedTickers?: string[];
      readinessContext?: string | null;
      portfolioContext?: PortfolioContext | null;
    };

    const trimmed = (question ?? "").trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }
    if (trimmed.length > 1000) {
      return NextResponse.json({ error: "Question is too long." }, { status: 400 });
    }

    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (profile) {
      systemPrompt += `\n\nThe user's investor profile is: ${profile}. Use this only for educational framing — not to give personalized advice.`;
    }
    if (watchedTickers && watchedTickers.length > 0) {
      systemPrompt += `\n\nThe user has saved these ETF examples to their watchlist: ${watchedTickers.join(", ")}. Use only for relevant educational context.`;
    }
    if (readinessContext) {
      systemPrompt += `\n\nThe user has entered the following readiness data into the app. Use this only to explain and educate — not to give personalized financial advice:\n${readinessContext}`;
    }
    if (portfolioContext) {
      systemPrompt += `\n\n${formatPortfolioContext(portfolioContext)}`;
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: "user", content: trimmed }],
    });

    const answer = message.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Coach API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
