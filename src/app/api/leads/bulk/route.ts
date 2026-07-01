import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import nodemailer from "nodemailer";
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

function parseEmails(toField: string): string[] {
  if (!toField) return [];
  return toField.split(/[,;\n]+/).map((e) => e.trim()).filter((e) => e && e.includes("@"));
}

export async function POST(req: NextRequest) {
  try {
    const { leadIds, subject, html, draftId } = await req.json();

    if (!leadIds?.length || !subject || !html) {
      return NextResponse.json({ error: "leadIds, subject, and html required" }, { status: 400 });
    }

    const env = loadEnv();
    const smtpHost = process.env.SMTP_HOST || env.SMTP_HOST;
    const smtpPass = process.env.SMTP_PASS || env.SMTP_PASS;
    const smtpUser = process.env.SMTP_USER || env.SMTP_USER;
    const smtpFrom = process.env.SMTP_FROM || env.SMTP_FROM || "Michael <myke@michaelsoft.co.ke>";

    if (!smtpHost || !smtpPass || !smtpUser) {
      return NextResponse.json({ error: "No email provider configured" }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const leads = await prisma.lead.findMany({ where: { id: { in: leadIds.map(Number) } } });
    const htmlBody = `<html><body style="font-family:sans-serif;font-size:14px;color:#333;line-height:1.6;">${html.replace(/\n/g, "<br>")}</body></html>`;

    let sentCount = 0;
    let failedCount = 0;
    const results: { leadId: number; email: string; ok: boolean; error?: string }[] = [];

    for (const lead of leads) {
      const allEmails = new Set<string>();
      if (lead.email) lead.email.split(/[,;\n]+/).forEach((e) => { const t = e.trim(); if (t.includes("@")) allEmails.add(t); });
      if (lead.enriched) {
        try {
          const enriched = JSON.parse(lead.enriched);
          enriched.emails?.forEach((e: string) => { const t = e.trim(); if (t.includes("@") && !t.includes(".webp") && !t.includes(".png")) allEmails.add(t); });
        } catch {}
      }

      for (const recipient of allEmails) {
        try {
          const info = await transporter.sendMail({
            from: smtpFrom, to: recipient, subject, html: htmlBody, text: html,
            replyTo: "0mykembugua@gmail.com",
            headers: { "X-Mailer": "Michaelsoft Leads", "Precedence": "personal" },
          });

          const textContent = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/?p[^>]*>/gi, "\n").replace(/<[^>]*>/g, "").trim();
          await prisma.message.create({
            data: { leadId: lead.id, direction: "outgoing", from: smtpFrom, to: recipient, subject, content: textContent, messageId: info.messageId || null },
          });

          await prisma.activity.create({
            data: { leadId: lead.id, type: "email_sent", detail: `Sent to ${recipient}` },
          });

          results.push({ leadId: lead.id, email: recipient, ok: true });
          sentCount++;
        } catch (err: any) {
          results.push({ leadId: lead.id, email: recipient, ok: false, error: err.message });
          failedCount++;
        }
      }

      if (allEmails.size > 0) {
        await prisma.lead.update({ where: { id: lead.id }, data: { status: "contacted" } });
      }
    }

    if (draftId) {
      await prisma.emailDraft.update({ where: { id: Number(draftId) }, data: { used: true } });
    }

    return NextResponse.json({ ok: sentCount > 0, sentCount, failedCount, results, provider: "smtp" });
  } catch (error: any) {
    console.error("Bulk send error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
