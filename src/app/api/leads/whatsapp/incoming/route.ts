import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function normalizePhone(p: string): string {
  const digits = p.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits.slice(-9);
  if (digits.startsWith("0")) return digits.slice(-9);
  return digits.slice(-9);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // OpenWA wraps payload in { event, data: { from, body, id, ... } }
    const event = body.event || "";
    const data = body.data || body;

    const from = data.from || data.author || "";
    const content = data.body || data.content || data.text || "";
    const messageId = data.id || data.messageId || data.key?.id || null;
    const timestamp = data.timestamp || body.timestamp || null;

    if (!from || !content) {
      // Accept but skip — webhook may send non-message events
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Extract phone from "12345@c.us" format
    const fromPhone = from.replace(/@.*/, "").replace(/\D/g, "");

    // Also check enriched emails for matching
    const leads = await prisma.lead.findMany({
      where: { phone: { not: null } },
      select: { id: true, phone: true, enriched: true },
    });

    let matchedLeadId: number | null = null;
    const fromNorm = normalizePhone(fromPhone);

    for (const lead of leads) {
      if (!lead.phone) continue;

      // Check main phone
      const leadNorm = normalizePhone(lead.phone);
      if (leadNorm && fromNorm && (fromNorm.endsWith(leadNorm) || leadNorm.endsWith(fromNorm))) {
        matchedLeadId = lead.id;
        break;
      }

      // Check enriched phones
      if (lead.enriched) {
        try {
          const enriched = JSON.parse(lead.enriched);
          if (enriched.phones) {
            for (const ep of enriched.phones) {
              const epNorm = normalizePhone(ep);
              if (epNorm && fromNorm && (fromNorm.endsWith(epNorm) || epNorm.endsWith(fromNorm))) {
                matchedLeadId = lead.id;
                break;
              }
            }
          }
        } catch {}
      }
      if (matchedLeadId) break;
    }

    if (matchedLeadId) {
      // Deduplicate by messageId
      if (messageId) {
        const existing = await prisma.message.findFirst({ where: { messageId } });
        if (existing) {
          return NextResponse.json({ ok: true, matchedLeadId, duplicate: true });
        }
      }

      await prisma.message.create({
        data: {
          leadId: matchedLeadId,
          direction: "incoming",
          from: from,
          to: "",
          subject: "WhatsApp",
          content: content,
          messageId: messageId || null,
        },
      });

      await prisma.activity.create({
        data: {
          leadId: matchedLeadId,
          type: "whatsapp_received",
          detail: `Received from ${from}`,
        },
      });
    }

    return NextResponse.json({ ok: true, matchedLeadId });
  } catch (error: any) {
    console.error("WhatsApp incoming error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
