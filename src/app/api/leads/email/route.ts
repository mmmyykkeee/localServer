import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { prisma } from "@/lib/prisma";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { lead, tone, purpose } = await req.json();

    const enriched = lead.enriched ? JSON.parse(lead.enriched) : null;

    const prompt = `You are a professional B2B salesperson writing a cold email on behalf of Michaelsoft Procurement — a web-based procurement platform for small and medium businesses in Kenya and emerging markets.

Write a cold email with this flow:
1. Open by acknowledging what the recipient's company does and show genuine awareness of their work.
2. Transition into an unexploited opportunity — their customers likely struggle with fragmented, manual procurement processes (scattered price lists, no supplier comparison, no real-time visibility, payment fragmentation).
3. Introduce Michaelsoft Procurement as the solution they can offer their customers — a simple, flexible, affordable platform that replaces paper-based purchasing with a single digital workspace covering supplier management, price comparison, order tracking, invoicing, and M-Pesa payments.
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
- No emojis
- No excessive punctuation or exclamation marks
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
