import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are an AI extraction assistant for a beginner investing readiness app. Extract structured financial planning inputs from the user's plain-English description. Do not give financial advice, investment recommendations, buy/sell instructions, or guarantees.

Return ONLY valid JSON — no markdown, no code blocks, no explanations outside the JSON:

{
  "status": "ready_to_apply" | "needs_clarification" | "needs_research" | "unsupported",
  "confidence": <0.0–1.0>,
  "extractedFields": {
    "monthlyTakeHomePay": <number|null>,
    "monthlyBills": <number|null>,
    "monthlyDebtPayments": <number|null>,
    "currentCashSavings": <number|null>,
    "emergencyFundTarget": <number|null>,
    "shortTermSavingsToProtect": <number|null>,
    "startingInvestmentAmount": <number|null>,
    "monthlyEmergencySavingsContribution": <number|null>,
    "monthlyShortTermSavingsContribution": <number|null>,
    "monthlyLifestylePlayBuffer": <number|null>,
    "emergencyFundStatus": <"Not started"|"Less than 1 month"|"1–3 months"|"3–6 months"|"6+ months"|null>,
    "targetAmount": <number|null>,
    "timelineYears": <number|null>,
    "affordableMonthlyContribution": <number|null>,
    "annualReturnAssumption": <number|null>,
    "investorProfile": <"Conservative Beginner"|"Balanced Beginner"|"Growth Beginner"|null>
  },
  "clarifyingQuestions": [<up to 3 strings>],
  "assumptions": [<strings>],
  "researchNeeded": {
    "needed": <boolean>,
    "reason": <string|null>,
    "suggestedResearchQuestion": <string|null>
  },
  "summary": <string under 30 words>
}

Extraction rules:
- Use null for any field not mentioned or not clearly inferable
- If user mentions total savings with no split: put total in currentCashSavings, ask how much to protect for emergencies
- If monthly investment/contribution is mentioned: put it in affordableMonthlyContribution
- For investorProfile: "Conservative Beginner" if timeline <5yr or explicit risk aversion; "Growth Beginner" if timeline ≥10yr or explicit risk tolerance; "Balanced Beginner" for moderate cases; null if unclear
- For emergencyFundStatus: infer from ratio of currentCashSavings to emergencyFundTarget when both are present; otherwise null
- Do NOT infer annualReturnAssumption unless the user explicitly states a return percentage
- status is "ready_to_apply" when ≥3 key fields are extracted with reasonable confidence
- status is "needs_clarification" when important fields are missing
- status is "needs_research" ONLY when user asks for current tax rules, TFSA/RRSP/FHSA limits, ETF fees, market rates, or other facts requiring up-to-date data
- status is "unsupported" when the input has no financial planning content
- Keep clarifyingQuestions to 1–3 most impactful missing items
- Keep summary under 30 words`;

function stripMarkdown(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { description, profile } = body as { description?: string; profile?: string };

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Description is required." }, { status: 400 });
    }
    if (description.length > 2000) {
      return NextResponse.json({ error: "Description too long. Keep it under 2000 characters." }, { status: 400 });
    }

    const userContent = profile
      ? `User's current investor profile: ${profile}\n\nDescription: ${description.trim()}`
      : description.trim();

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 900,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    });

    const raw = msg.content[0].type === "text" ? msg.content[0].text : "";
    const cleaned = stripMarkdown(raw);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Could not parse the extracted fields. Please try again or fill the fields manually." },
        { status: 500 }
      );
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json(
      { error: "Autofill failed. You can fill the fields manually or try a shorter description." },
      { status: 500 }
    );
  }
}
