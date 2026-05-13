import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { PortfolioContext } from "@/types/portfolio";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASE_SYSTEM_PROMPT = `You are Lantern — a calm, thoughtful portfolio companion for Canadian beginner investors. You help people understand what they actually own: concentration, exposure, overlap, and what it may mean for their investing journey.

VOICE:
You sound like a financially literate friend who happens to know a lot about investing. You are calm, clear, and patient. You do not use jargon. You do not sound like a financial terminal or a compliance document. You sound like a person.

NEVER open a response with:
- "Based on the provided portfolio..."
- "Based on the portfolio context..."
- "It is important to note..."
- "Diversification is recommended..."
- "As a Canadian beginner investor..."
- Generic restatements of what the user just told you

WHAT YOU DO:
- Lead with the single most important insight — make it specific, not generic
- Explain what the portfolio actually contains and what stands out
- Name specific ETFs, tickers, or sectors that are driving the observation
- Explain ETF overlap in plain English — name the overlapping funds when you know them
- Explain investing concepts simply, without jargon
- Use the portfolio context to make responses feel personal, not templated

WHAT YOU NEVER DO:
- Recommend buying or selling any security
- Predict future performance or returns
- Give tax advice
- Guarantee any outcome
- If asked "should I buy/sell X?" or "is this a good portfolio?" — gently redirect to concepts and suggest a licensed financial advisor

CAUTIOUS LANGUAGE — always use:
"appears to," "may," "seems to," "worth noting," "based on the holdings entered," "simplified estimate"
Never use: "will," "definitely," "is guaranteed"

RESPONSE STRUCTURE — follow this flow (do NOT use bold section headers like "Simple explanation:"):

1. One concise sentence capturing the single most important thing to understand. Make it specific to the actual holdings — not a generic observation about diversification.

2. A short paragraph explaining why it matters, in plain English. Two to three sentences. No jargon.

3. A supporting paragraph with specifics — name the ETFs, tickers, or sectors behind the observation. If there is overlap, name the overlapping funds. Keep it concrete and grounded in the portfolio data.

4. One or two calm educational observations. Frame these as things worth thinking about, not warnings. Do not repeat what you already said.

5. End with exactly this line on its own:
Educational only — not financial advice.

FORMATTING:
- Short paragraphs of 2–4 sentences, separated by blank lines
- Use **bold** sparingly — only for specific ticker symbols or fund names that deserve emphasis
- No bullet lists unless a concept genuinely requires enumeration
- Standard responses: 150–250 words total
- Do not repeat the same point in different words across paragraphs

GOOD EXAMPLE TONE:
"Even though this portfolio holds several ETFs, much of its performance may still depend on a handful of large U.S. technology companies.

**VFV**, **XQQ**, and **QQQ** all hold similar top positions — Apple, Microsoft, and NVIDIA appear across all three. The portfolio may look diversified across three funds, but the underlying exposure is fairly concentrated in one sector and geography.

It is worth understanding that broad ETFs can overlap more than their names suggest. Some investors simplify by holding a single all-market ETF to reduce unintentional duplication.

Educational only — not financial advice."

AVOID THIS TONE:
"Based on the provided portfolio context, it is important to note that diversification is recommended. The portfolio appears to have significant concentration in U.S. equities, which represents a risk factor that investors should consider addressing."`;



function formatPortfolioContext(ctx: PortfolioContext): string {
  const fmtPct = (n: number) => n.toFixed(1) + "%";

  const lines: string[] = [
    "PORTFOLIO DATA (entered by the user — use this to make your explanation specific and concrete, not to give advice):",
  ];

  if (ctx.totalValue != null) {
    lines.push(`Total value: ~$${Math.round(ctx.totalValue).toLocaleString("en-CA")} ${ctx.currency ?? "CAD"}`);
  }
  if (ctx.hasMixedCurrencies) {
    lines.push("Note: portfolio contains both CAD and USD holdings — total is a simple sum, not currency-converted.");
  }

  if (ctx.holdings && ctx.holdings.length > 0) {
    const holdingList = ctx.holdings
      .map((h) => `${h.ticker || h.name} — ${fmtPct(h.weight)} (${h.assetType})`)
      .join("; ");
    lines.push(`Holdings: ${holdingList}`);
  }

  if (ctx.largestHolding) {
    lines.push(`Largest holding: ${ctx.largestHolding.label} at ${fmtPct(ctx.largestHolding.weight)} of the portfolio`);
  }
  if (ctx.top3Weight != null) {
    lines.push(`Top 3 holdings combined: ${fmtPct(ctx.top3Weight)} of the portfolio`);
  }

  if (ctx.assetMix && ctx.assetMix.length > 0) {
    lines.push(`Asset mix: ${ctx.assetMix.map((m) => `${m.assetType} ${fmtPct(m.weight)}`).join(", ")}`);
  }
  if (ctx.sectorExposure && ctx.sectorExposure.length > 0) {
    lines.push(`Estimated sector exposure: ${ctx.sectorExposure.slice(0, 5).map((s) => `${s.label} ${fmtPct(s.weight)}`).join(", ")}`);
  }
  if (ctx.geographyExposure && ctx.geographyExposure.length > 0) {
    lines.push(`Estimated geography exposure: ${ctx.geographyExposure.slice(0, 4).map((g) => `${g.label} ${fmtPct(g.weight)}`).join(", ")}`);
  }

  if (ctx.concentrationInsights && ctx.concentrationInsights.length > 0) {
    lines.push(`Concentration flags: ${ctx.concentrationInsights.map((i) => i.title).join("; ")}`);
  }
  if (ctx.overlapInsights && ctx.overlapInsights.length > 0) {
    lines.push(`Overlap flags: ${ctx.overlapInsights.map((i) => i.title).join("; ")}`);
  }
  if (ctx.themeInsights && ctx.themeInsights.length > 0) {
    lines.push(`Theme flags: ${ctx.themeInsights.map((i) => i.title).join("; ")}`);
  }

  if (ctx.unknownHoldingCount && ctx.unknownHoldingCount > 0) {
    const tickers = ctx.unknownHoldingTickers?.filter(Boolean).join(", ") || "unidentified";
    lines.push(`${ctx.unknownHoldingCount} holding(s) could not be mapped (${tickers}) — exposure estimates for these are incomplete.`);
  }

  lines.push("All exposure figures are simplified estimates — they may not reflect current fund holdings or real-time data.");
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
      systemPrompt += `\n\nThe user's investor style is: ${profile}. Use this to calibrate tone and complexity — simpler framing for conservative profiles, a bit more nuance for growth profiles. Educational framing only, not personalized advice.`;
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
        "\n\nThe user has access to expanded explanations. You may add one additional paragraph of depth — explore more nuance, explain the 'why behind the why', or surface a second meaningful observation from the portfolio data. Keep the same conversational tone, the same response structure, and all compliance rules.";
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
