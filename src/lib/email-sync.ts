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
      authTimeout: 15000,
    },
  });

  await connection.openBox("INBOX");

  const searchCriteria = ["UNSEEN"];
  const fetchOptions = {
    bodies: [""],
    markSeen: false,
  };

  const messages = await connection.search(searchCriteria, fetchOptions);
  console.log(`IMAP: Found ${messages.length} total emails in inbox`);

  const leads = await prisma.lead.findMany({
    where: { email: { not: null } },
    select: { id: true, email: true },
  });

  const leadEmailMap = new Map<string, number>();
  for (const lead of leads) {
    if (lead.email) leadEmailMap.set(lead.email.toLowerCase(), lead.id);
  }

  let matched = 0;
  let skipped = 0;
  const fromAddresses = new Set<string>();
  for (const item of messages) {
    try {
      const all = item.parts.map((p: any) => p.body).join("");
      if (!all) continue;

      const parsed = await simpleParser(all);

      const fromEmail = parsed.from?.value?.[0]?.address?.toLowerCase();
      if (!fromEmail) { skipped++; continue; }
      fromAddresses.add(fromEmail);

      const leadId = leadEmailMap.get(fromEmail);
      if (!leadId) { skipped++; continue; }

      const body = parsed.text || "";
      const messageId = parsed.messageId || null;

      if (!body.trim()) continue;

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
          content: body.trim(),
          messageId: messageId || null,
        },
      });

      await prisma.lead.update({
        where: { id: leadId },
        data: { status: "contacted" },
      });

      matched++;
    } catch (e) {
      console.error("Error processing message:", e);
    }
  }

  console.log(`IMAP sync: ${messages.length} total, ${matched} matched, ${skipped} skipped`);
  console.log(`Unique from addresses (${fromAddresses.size}):`, [...fromAddresses].slice(0, 20));

  connection.end();
  return { total: messages.length, matched };
}
