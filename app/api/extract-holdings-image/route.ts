import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const EXTRACTION_SYSTEM =
  "You are a data extraction assistant for a beginner investing education app. " +
  "Your only job is to extract portfolio holdings data from screenshots and return it as valid JSON. " +
  "Do not provide investment advice. Do not add commentary outside the JSON.";

const EXTRACTION_PROMPT = `Extract portfolio holdings from this screenshot.

Return ONLY valid JSON with this exact shape, no other text:
{
  "status": "ready_to_review" | "needs_clearer_image" | "unsupported" | "error",
  "confidence": <number 0.0-1.0, overall confidence>,
  "extractedHoldings": [
    {
      "ticker": <string or null>,
      "name": <string or null>,
      "assetType": <"Stock"|"ETF"|"Mutual Fund"|"Bond ETF"|"Cash"|"Other"|null>,
      "quantity": <number or null>,
      "marketPrice": <number or null>,
      "marketValue": <number or null>,
      "currency": <"CAD"|"USD"|other string or null>,
      "accountType": <"TFSA"|"RRSP"|"FHSA"|"Non-registered"|"RESP"|"Other"|null>,
      "confidence": <number 0.0-1.0 for this row>,
      "notes": [<strings: caveats, missing fields, ambiguities>]
    }
  ],
  "warnings": [<global warning strings>],
  "summary": "<1-2 sentence plain English description of what was found>"
}

Rules:
- Extract only what is clearly visible. Do not infer or guess missing values unless a calculation is obvious (e.g. quantity × price = market value).
- If the image shows a holdings or positions table, return status "ready_to_review".
- If the image is blurry, too small, or unreadable, return status "needs_clearer_image".
- If the image does not appear to show a holdings list at all, return status "unsupported".
- Remove currency symbols ($, CAD, USD) and commas from numeric values before returning them as numbers.
- If you see both quantity and price but no market value, calculate marketValue = quantity × price.
- For assetType: infer only if obvious from the name or type column (e.g. "ETF" in name → "ETF").
- For accountType: extract only if explicitly shown (e.g. "TFSA", "RRSP").
- Return no text outside the JSON object.`;

function normalizeMediaType(
  type: string
): "image/jpeg" | "image/png" | "image/webp" | null {
  if (type === "image/png") return "image/png";
  if (type === "image/jpeg" || type === "image/jpg") return "image/jpeg";
  if (type === "image/webp") return "image/webp";
  return null;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("image");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload a PNG, JPG, or WebP image." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Image is too large. Try cropping the screenshot to just the holdings table." },
        { status: 413 }
      );
    }

    const mediaType = normalizeMediaType(file.type);
    if (!mediaType) {
      return NextResponse.json(
        { error: "Unsupported image format." },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: EXTRACTION_SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: mediaType, data: base64 },
            },
            { type: "text", text: EXTRACTION_PROMPT },
          ],
        },
      ],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({
        status: "error",
        confidence: 0,
        extractedHoldings: [],
        warnings: ["Could not parse the extraction response."],
        summary: "Extraction failed. Please try a clearer screenshot or use CSV upload.",
      });
    }

    const result = JSON.parse(jsonMatch[0]);
    return NextResponse.json(result);
  } catch (err) {
    console.error("extract-holdings-image error:", err);
    return NextResponse.json(
      {
        status: "error",
        confidence: 0,
        extractedHoldings: [],
        warnings: ["Extraction failed due to an internal error."],
        summary: "Extraction failed. You can still use CSV upload or manual entry.",
      },
      { status: 500 }
    );
  }
}
