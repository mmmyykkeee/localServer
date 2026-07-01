import { NextRequest, NextResponse } from "next/server";

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
  if (!response.ok) throw new Error(`${response.status}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(req: NextRequest) {
  try {
    const { lead, tone, purpose } = await req.json();
    const enriched = lead.enriched ? JSON.parse(lead.enriched) : null;

    const prompt = `Write a short WhatsApp message (under 100 words) on behalf of Michaelsoft Procurement — a web-based procurement platform for SMEs in Kenya.

Context about the recipient:
- Name: ${lead.name || "there"}
- Company: ${lead.company || "their company"}
- About them: ${enriched?.description || "N/A"}

The message should:
1. Be casual and friendly (WhatsApp tone)
2. Mention their company briefly
3. Introduce Michaelsoft Procurement as a simple, affordable procurement tool
4. End with a question to start a conversation

Tone: ${tone || "casual, friendly, brief"}
No emojis. No excessive punctuation. Keep it conversational.`;

    let message = "";
    for (const model of FREE_MODELS) {
      for (let attempt = 0; attempt < OPENROUTER_KEYS.length; attempt++) {
        try {
          message = await callOpenRouter(prompt, model, getNextKey());
          if (message) break;
        } catch { continue; }
      }
      if (message) break;
    }

    if (!message) {
      return NextResponse.json({ message: "", error: "Failed to generate" }, { status: 500 });
    }

    return NextResponse.json({ message });
  } catch (error) {
    return NextResponse.json({ message: "", error: "Failed" }, { status: 500 });
  }
}
