import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { lead, tone, purpose } = await req.json();

    const enriched = lead.enriched ? JSON.parse(lead.enriched) : null;

    const prompt = `You are Michael from Michaelsoft, writing a cold email to a company that sells software or services to businesses.

Write a personalized email with this exact flow:
1. Open by mentioning something specific you noticed about their company and what they do.
2. Point out an unattended gap — their customers likely need a procurement system but they don't offer one.
3. Introduce Michaelsoft Procurement (https://procurement.michaelsoft.co.ke/overview) as a platform that could complement their existing offerings. It is a simple, affordable procurement platform for SMEs that works with M-Pesa, covering supplier management, price comparison, order tracking, and invoicing.
4. Say you are looking to add your technology to their already existing one — a partnership where they can offer procurement to their customers.
5. End with a soft ask to chat.

Lead info:
- Name: ${lead.name || "Unknown"}
- Company: ${lead.company || "Unknown"}
- Website: ${lead.website || "N/A"}
- About them: ${enriched?.description || "No description available"}

Tone: ${tone || "professional, warm, and consultative"}

Rules:
- Under 150 words
- Be specific to their business
- No emojis
- No excessive punctuation or exclamation marks
- Do NOT use words like: leverage, streamline, empower, unlock, transform, cutting-edge, revolutionary, game-changing
- Sign off as "Best regards,\nMichael\n+254704472009"`;

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
