import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const OPENROUTER_KEYS = [];

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

let keyIndex = 0;

function getNextKey(): string {
  const key = OPENROUTER_KEYS[keyIndex % OPENROUTER_KEYS.length];
  keyIndex++;
  return key;
}

const FREE_MODELS = [
  "google/gemma-4-26b-a4b-it:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "qwen/qwen3-coder:free",
  "openai/gpt-oss-20b:free",
  "nvidia/nemotron-nano-9b-v2:free",
  "google/gemma-4-31b-it:free",
];

async function callOpenRouter(prompt: string, model: string, apiKey: string): Promise<string> {
  const response = await fetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://michaelsoft.co.ke",
      "X-Title": "MichaelSoft Leads",
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(req: NextRequest) {
  try {
    const { lead, tone, purpose } = await req.json();

    const enriched = lead.enriched ? JSON.parse(lead.enriched) : null;

    const prompt = `You are a professional B2B salesperson writing a cold email on behalf of Michaelsoft Procurement — a web-based procurement platform for small and medium businesses in Kenya and emerging markets.

Write a cold email with this flow:
1. Open by acknowledging what the recipient's company does and show genuine awareness of their work.
2. Transition into an untapped opportunity — there may be an opportunity to help their customers with procurement, and Michaelsoft Procurement could be a good fit.
3. Introduce Michaelsoft Procurement as a simple, flexible, affordable platform that covers supplier management, price comparison, order tracking, invoicing, and M-Pesa payments.
4. End with a clear call to action.

Lead info:
- Name: ${lead.name || "Unknown"}
- Company: ${lead.company || "Unknown"}
- Website: ${lead.website || "N/A"}
- About them: ${enriched?.description || "No description available"}

Tone: ${tone || "professional, warm, and consultative"}
Purpose: ${purpose || "presenting an opportunity to add procurement software to their offerings"}

Rules:
- Keep it under 150 words
- Do NOT assume they already have procurement — you are introducing the concept
- Be specific to their business and industry
- Focus on the opportunity for THEIR customers, not just a generic pitch
- Do NOT state their customers have problems — instead suggest there may be an untapped opportunity
- No emojis
- No excessive punctuation or exclamation marks
- Sign off as "Best regards,\nMichael\nwww.michaelsoft.co.ke"`;

    let email = "";
    let lastError = "";

    // Try each model with rotating keys
    for (const model of FREE_MODELS) {
      for (let attempt = 0; attempt < OPENROUTER_KEYS.length; attempt++) {
        const apiKey = getNextKey();
        try {
          email = await callOpenRouter(prompt, model, apiKey);
          if (email) break;
        } catch (err: any) {
          lastError = `${model} (key ...${apiKey.slice(-6)}): ${err.message}`;
          continue;
        }
      }
      if (email) break;
    }

    if (!email) {
      console.error("All models/keys failed:", lastError);
      return NextResponse.json({ email: "", error: "All models failed" }, { status: 500 });
    }

    if (lead.id) {
      const draft = await prisma.emailDraft.create({
        data: {
          leadId: lead.id,
          content: email,
          tone: tone || null,
          purpose: purpose || null,
        },
      });
      return NextResponse.json({ email, draftId: draft.id });
    }

    return NextResponse.json({ email });
  } catch (error) {
    console.error("Email generation error:", error);
    return NextResponse.json({ email: "", error: "Failed to generate email" }, { status: 500 });
  }
}
