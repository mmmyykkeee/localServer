import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { lead, tone, purpose } = await req.json();

    const enriched = lead.enriched ? JSON.parse(lead.enriched) : null;

    const prompt = `Write a short, personal cold email from Michael at Michaelsoft to a business owner. This is a one-on-one outreach, not a mass email.

Write with this flow:
1. Open by mentioning something specific about their business you noticed.
2. Briefly mention a problem their customers likely face with procurement.
3. Mention Michaelsoft Procurement as something that could help — simple, affordable, works with M-Pesa.
4. Ask if they'd be open to a quick chat.

Lead info:
- Name: ${lead.name || "Unknown"}
- Company: ${lead.company || "Unknown"}
- Website: ${lead.website || "N/A"}
- About them: ${enriched?.description || "No description available"}

Tone: ${tone || "warm, conversational, like writing to a colleague"}

Rules:
- Write like a real person, not a marketer
- Under 100 words
- No salesy language (avoid: opportunity, solution, leverage, streamline, empower, unlock, transform, cutting-edge, revolutionary, game-changing)
- No bullet points or lists
- No emojis
- No excessive punctuation
- No "Dear Sir/Madam" — use their name
- Sign off as "Michael\n+254704472009"`;

    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 500,
    });

    const email = completion.choices[0]?.message?.content || "";

    if (email && lead.id) {
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
