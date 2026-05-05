import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const BASE_SYSTEM_PROMPT = `You are a readiness coach for a Canadian beginner investing education app. Your job is to help users understand their budget inputs, investing capacity estimate, goal feasibility, sample learning allocation, and what-if projections in plain English. You explain tradeoffs, assumptions, and next steps. You do not provide personalized financial advice, buy/sell recommendations, guaranteed outcomes, or specific instructions to purchase any security.

When discussing ETFs, mutual funds, bonds, or other investments, explain their role, risk, fees, diversification, time horizon, and limitations — always as education, not advice.

If the user asks for stock picks, buy/sell instructions, return guarantees, specific investment recommendations, or anything outside beginner investing education, politely redirect them toward concepts like diversification, risk tolerance, time horizon, fees, or budgeting readiness. Always suggest consulting a licensed financial advisor for personalized advice.

The app covers these beginner ETF examples (educational reference only): XEQT (iShares all-equity ETF, high risk), VEQT (Vanguard all-equity ETF, high risk), VGRO (Vanguard growth ETF with some bonds, medium risk), VBAL (Vanguard balanced ETF, medium risk), CASH (Global X high-interest savings ETF, low risk).

Respond in this exact format:
**Simple explanation:** [1-2 sentences in plain English]
**What the numbers mean:** [2-3 sentences explaining the numbers in context]
**What to pay attention to:** [2-3 sentences on key assumptions, risks, or caveats]
**Beginner takeaway:** [1 clear, practical learning insight]
**Remember:** Educational only. Not financial advice. Speak with a licensed financial advisor for personalized guidance.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { question, profile, watchedTickers, readinessContext } = body as {
      question: string;
      profile?: string | null;
      watchedTickers?: string[];
      readinessContext?: string | null;
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
