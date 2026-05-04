import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASE_SYSTEM_PROMPT = `You are a beginner investing education coach for a Canadian investing app. Explain investing concepts in plain English. Your job is to educate, not provide personalized financial advice. Do not tell users exactly what to buy or sell. Do not guarantee returns. Do not recommend individual stocks as 'best buys.' When discussing ETFs, explain tradeoffs, risk, diversification, time horizon, and fees. Always end your answer with a brief reminder that it is educational only and not financial advice.

The app covers these beginner ETFs: XEQT (iShares all-equity ETF, high risk), VEQT (Vanguard all-equity ETF, high risk), VGRO (Vanguard growth ETF with some bonds, medium risk), VBAL (Vanguard balanced ETF, medium risk), CASH (Global X high-interest savings ETF, low risk).

If the user asks for hot stock picks, buy/sell instructions, return guarantees, or anything outside beginner education, politely redirect them to concepts like diversification, risk tolerance, time horizon, or fees.

Respond in this exact format:
**Simple answer:** [1-2 sentences]
**Why it matters:** [2-3 sentences]
**Beginner takeaway:** [1 sentence]
**Remember:** [brief educational-only disclaimer]`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, profile, watchedTickers } = body as {
      question: string;
      profile?: string | null;
      watchedTickers?: string[];
    };

    const trimmed = (question ?? "").trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
    }
    if (trimmed.length > 500) {
      return NextResponse.json({ error: "Question is too long." }, { status: 400 });
    }

    let systemPrompt = BASE_SYSTEM_PROMPT;
    if (profile) {
      systemPrompt += `\n\nThe user's investor profile is: ${profile}. Use this only for educational framing — not to give personalized advice.`;
    }
    if (watchedTickers && watchedTickers.length > 0) {
      systemPrompt += `\n\nThe user has saved these ETF tickers to their watchlist: ${watchedTickers.join(", ")}. Use only for relevant educational context.`;
    }

    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
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
