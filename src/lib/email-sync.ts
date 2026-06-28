import imaps from "imap-simple";
import { simpleParser } from "mailparser";
import { prisma } from "@/lib/prisma";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  try {
    const envPath = resolve(process.cwd(), ".env");
    const content = readFileSync(envPath, "utf-8");
    const vars: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const match = line.match(/^([A-Z_]+)=(.*)$/);
      if (match) vars[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
    return vars;
  } catch { return {}; }
}

export async function syncEmailReplies() {
  const env = loadEnv();
  const imapUser = process.env.SMTP_USER || env.SMTP_USER;
  const imapPass = process.env.SMTP_PASS || env.SMTP_PASS;

  if (!imapUser || !imapPass) {
    throw new Error("IMAP credentials not configured");
  }

  const connection = await imaps.connect({
    imap: {
      user: imapUser,
      password: imapPass,
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      authTimeout: 10000,
    },
  });

  await connection.openBox("INBOX");

  const searchCriteria = ["UNSEEN"];
  const fetchOptions = { bodies: ["HEADER", "TEXT"], markSeen: true };

  const messages = await connection.search(searchCriteria, fetchOptions);

  const leads = await prisma.lead.findMany({
    where: { email: { not: null } },
    select: { id: true, email: true },
  });

  const leadEmailMap = new Map<string, number>();
  for (const lead of leads) {
    if (lead.email) leadEmailMap.set(lead.email.toLowerCase(), lead.id);
  }

  let matched = 0;
  for (const item of messages) {
    const all = item.parts.map((p: any) => p.body).join("");
    const parsed = await simpleParser(all);

    const fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase();
    if (!fromEmail || !leadEmailMap.has(fromEmail)) continue;

    const leadId = leadEmailMap.get(fromEmail)!;
    const body = parsed.text || "";
    const messageId = parsed.messageId || null;

    const existingMessage = messageId
      ? await prisma.message.findFirst({ where: { messageId } })
      : null;
    if (existingMessage) continue;

    await prisma.message.create({
      data: {
        leadId,
        direction: "incoming",
        from: fromEmail,
        to: imapUser || "",
        subject: parsed.subject || "",
        content: body,
        messageId: messageId || null,
      },
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "contacted" },
    });

    matched++;
  }

  connection.end();
  return { total: messages.length, matched };
}
