import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { PortfolioContext } from "@/types/portfolio";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASE_SYSTEM_PROMPT = `You are an AI Portfolio Coach for Canadian beginner investors. Your job is to explain portfolio holdings, concentration, exposure, overlap, contribution scenarios, and investing concepts in plain English. You help users understand what they own, what they're exposed to, and what to consider next — without pretending to be a day trader.

LANGUAGE RULES — always use cautious language:
- Use: "appears," "may," "seems to," "worth understanding," "based on the holdings entered," "simplified mapping," "educational estimate"
- Avoid confident predictive language: "will," "definitely," "guaranteed"
- Always note that exposure mappings are simplified estimates

WHAT YOU DO:
- Explain concentration, diversification, asset type, sector, geography, and currency exposure in plain English
- Reference specific holdings, weights, and exposures from the user's Portfolio X-Ray when available
- Explain ETF overlap and what it means for diversification
- Explain contribution scenarios and their assumptions
- Explain what broad-market ETFs like XEQT, VEQT, VGRO, or VFV typically contain
- Explain beginner investing concepts clearly

WHAT YOU DO NOT DO:
- Do not recommend buying or selling any specific security
- Do not predict future market performance or returns
- Do not guarantee any outcome from any strategy
- Do not give tax advice
- Do not pretend to know the user's full financial situation, goals, or risk tolerance
- When asked "should I buy/sell X?" or "is this a good portfolio?", redirect to concepts (concentration, overlap, diversification, time horizon, fees) and suggest a licensed financial advisor

CONTEXTUAL EXAMPLE LANGUAGE:
- "NVIDIA appears to make up a large portion of the portfolio, which may increase sensitivity to one company or sector."
- "XEQT and VEQT may serve similar all-equity roles — holding both could mean more overlap than additional diversification."
- "Broad ETFs often include large technology companies like NVIDIA or Apple, so adding them individually may create unintended concentration."
- "The portfolio appears primarily exposed to U.S. equities based on the holdings entered."
- "Some holdings could not be mapped, so exposure estimates may be incomplete."
- "This scenario is a simplified estimate and does not predict future returns."

RESPONSE FORMAT — always use this exact structure:
**Simple explanation:** [1–2 sentences in plain English]
**What the numbers suggest:** [2–3 sentences — reference specific holdings, weights, or exposures from the portfolio context where relevant]
**What to pay attention to:** [2–3 sentences on assumptions, limitations, or caveats]
**Questions to consider:** [2–3 beginner-friendly follow-up questions]
**Remember:** Educational only. Not financial advice. Speak with a licensed financial advisor for personalized guidance.`;

function formatPortfolioContext(ctx: PortfolioContext): string {
  const fmtVal = (n: number) =>
    "$" + n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtPct = (n: number) => n.toFixed(1) + "%";

  const lines: string[] = [
    "PORTFOLIO X-RAY CONTEXT (from holdings entered by the user — use this to explain, not to advise):",
  ];

  if (ctx.reportName) lines.push(`Report name: ${ctx.reportName}`);
  if (ctx.savedAt) lines.push(`Saved: ${ctx.savedAt}`);
  if (ctx.totalValue != null) {
    lines.push(`Total portfolio value: ${fmtVal(ctx.totalValue)} ${ctx.currency ?? "CAD"}`);
  }

  if (ctx.holdings && ctx.holdings.length > 0) {
    const holdingList = ctx.holdings
      .map((h) => `${h.ticker || h.name} (${fmtPct(h.weight)}, ${fmtVal(h.marketValue)}, ${h.assetType})`)
      .join("; ");
    lines.push(`Holdings (${ctx.holdings.length}): ${holdingList}`);
  }

  if (ctx.largestHolding) {
    lines.push(`Largest holding: ${ctx.largestHolding.label} at ${fmtPct(ctx.largestHolding.weight)}`);
  }
  if (ctx.top3Weight != null) {
    lines.push(`Top 3 holdings combined: ${fmtPct(ctx.top3Weight)}`);
  }

  if (ctx.assetMix && ctx.assetMix.length > 0) {
    lines.push(`Asset type mix: ${ctx.assetMix.map((m) => `${m.assetType} ${fmtPct(m.weight)}`).join(", ")}`);
  }
  if (ctx.sectorExposure && ctx.sectorExposure.length > 0) {
    lines.push(`Sector exposure (estimated): ${ctx.sectorExposure.slice(0, 6).map((s) => `${s.label} ${fmtPct(s.weight)}`).join(", ")}`);
  }
  if (ctx.geographyExposure && ctx.geographyExposure.length > 0) {
    lines.push(`Geography exposure (estimated): ${ctx.geographyExposure.slice(0, 5).map((g) => `${g.label} ${fmtPct(g.weight)}`).join(", ")}`);
  }
  if (ctx.currencyExposure && ctx.currencyExposure.length > 0) {
    lines.push(`Currency exposure (estimated): ${ctx.currencyExposure.map((c) => `${c.label} ${fmtPct(c.weight)}`).join(", ")}`);
  }
  if (ctx.hasMixedCurrencies) {
    lines.push("Mixed currencies: portfolio contains both CAD and USD holdings — total value shown is a simple sum without currency conversion.");
  }
  if (ctx.unknownHoldingCount && ctx.unknownHoldingCount > 0) {
    const tickers = ctx.unknownHoldingTickers?.filter(Boolean).join(", ") || "not identified";
    lines.push(`Unmapped holdings: ${ctx.unknownHoldingCount} holding(s) could not be mapped (${tickers}) — sector/geography/currency estimates for these are incomplete.`);
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

  lines.push("Important: all exposure figures are educational estimates using simplified static metadata. They may not reflect current fund holdings, fees, or real-time prices.");
  return lines.join("\n");
}

interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      question,
      profile,
      watchedTickers,
      readinessContext,
      portfolioContext,
      conversationHistory,
      premiumExpanded,
    } = body as {
      question: string;
      profile?: string | null;
      watchedTickers?: string[];
      readinessContext?: string | null;
      portfolioContext?: PortfolioContext | null;
      conversationHistory?: ConversationTurn[];
      premiumExpanded?: boolean;
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
      systemPrompt += `\n\nThe user's investor profile is: ${profile}. Use this for educational framing only — not to give personalized advice.`;
    }
    if (watchedTickers && watchedTickers.length > 0) {
      systemPrompt += `\n\nThe user has saved these ETF examples to their watchlist: ${watchedTickers.join(", ")}. Reference only for relevant educational context.`;
    }
    if (readinessContext) {
      systemPrompt += `\n\nThe user has entered the following readiness data. Use only to explain and educate — not to give personalized advice:\n${readinessContext}`;
    }
    if (portfolioContext) {
      systemPrompt += `\n\n${formatPortfolioContext(portfolioContext)}`;
    }

    if (premiumExpanded) {
      systemPrompt +=
        "\n\nThe user has access to expanded Portfolio Coach explanations. Provide a bit more depth in each section while keeping the same structure, cautious language, and all safety rules (still no buy/sell recommendations).";
    }

    // Include up to 3 prior Q&A turns (6 messages) for in-session follow-up support
    const priorTurns = (conversationHistory ?? []).slice(-6);
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...priorTurns,
      { role: "user", content: trimmed },
    ];

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: premiumExpanded ? 2048 : 1024,
      system: systemPrompt,
      messages,
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
