import { NextRequest, NextResponse } from "next/server";

const OPENWA_URL = "http://localhost:2785/api";
const OPENWA_KEY = "owa_k1_726289b2a9627ea62066a90e387b1bf5d0cf3eea222a1f03addcda97a20e0821";

function formatPhoneToChatId(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, "");
  const num = cleaned.startsWith("254") ? cleaned : cleaned.startsWith("0") ? "254" + cleaned.slice(1) : cleaned;
  return `${num}@c.us`;
}

async function getActiveSession(): Promise<string | null> {
  try {
    const res = await fetch(`${OPENWA_URL}/sessions`, {
      headers: { "x-api-key": OPENWA_KEY },
    });
    const sessions = await res.json();
    const active = sessions.find((s: any) => s.status === "connected" || s.status === "ready");
    return active?.id || null;
  } catch {
    return null;
  }
}

async function sendWhatsAppMessage(sessionId: string, chatId: string, text: string): Promise<any> {
  const res = await fetch(`${OPENWA_URL}/sessions/${sessionId}/messages/send-text`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": OPENWA_KEY,
    },
    body: JSON.stringify({ chatId, text }),
  });
  return res.json();
}

export async function POST(req: NextRequest) {
  try {
    const { phone, message, leadId } = await req.json();

    if (!phone || !message) {
      return NextResponse.json({ error: "phone and message required" }, { status: 400 });
    }

    const signature = "\n\nKind Regards,\nMichael\nwww.michaelsoft.co.ke";
    const fullMessage = message.includes("michaelsoft.co.ke") ? message : message + signature;

    const sessionId = await getActiveSession();
    if (!sessionId) {
      return NextResponse.json({ error: "No active WhatsApp session. Connect one at http://localhost:2886" }, { status: 503 });
    }

    const chatId = formatPhoneToChatId(phone);
    const result = await sendWhatsAppMessage(sessionId, chatId, fullMessage);

    if (result.error) {
      return NextResponse.json({ error: result.error || "Failed to send" }, { status: 500 });
    }

    if (leadId) {
      const { prisma } = await import("@/lib/prisma");
      const { readFileSync } = await import("fs");
      const { resolve } = await import("path");

      let smtpFrom = "Michael <myke@michaelsoft.co.ke>";
      try {
        const envPath = resolve(process.cwd(), ".env");
        const envContent = readFileSync(envPath, "utf-8");
        const match = envContent.match(/^SMTP_FROM=(.*)$/m);
        if (match) smtpFrom = match[1].replace(/^["']|["']$/g, "");
      } catch {}

      await prisma.message.create({
        data: {
          leadId: Number(leadId),
          direction: "outgoing",
          from: "WhatsApp",
          to: phone,
          subject: "WhatsApp",
          content: message,
          messageId: result.messageId || null,
        },
      });

      await prisma.activity.create({
        data: { leadId: Number(leadId), type: "whatsapp_sent", detail: `Sent to ${phone}` },
      });
    }

    return NextResponse.json({ ok: true, messageId: result.messageId, sessionId });
  } catch (error: any) {
    console.error("WhatsApp send error:", error);
    return NextResponse.json({ error: error.message || "Failed to send" }, { status: 500 });
  }
}
