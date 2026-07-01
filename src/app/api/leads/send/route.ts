import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
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

function parseEmails(toField: string): string[] {
  if (!toField) return [];
  return toField
    .split(/[,;\n]+/)
    .map((e) => e.trim())
    .filter((e) => e && e.includes("@"));
}

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, replyTo, leadId } = await req.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: "to, subject, and html required" }, { status: 400 });
    }

    const env = loadEnv();
    const smtpHost = process.env.SMTP_HOST || env.SMTP_HOST;
    const smtpPass = process.env.SMTP_PASS || env.SMTP_PASS;
    const smtpUser = process.env.SMTP_USER || env.SMTP_USER;
    const smtpFrom = process.env.SMTP_FROM || env.SMTP_FROM || "Michael <myke@michaelsoft.co.ke>";

    if (smtpHost && smtpPass && smtpUser) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT) || 465,
          secure: true,
          auth: { user: smtpUser, pass: smtpPass },
        });

        const trackingPixel = (msgId: string) => `<img src="https://leads.michaelsoft.co.ke/api/leads/tracking?mid=${msgId}" width="1" height="1" style="display:none" alt="" />`;
        const htmlBody = `<html><body style="font-family:sans-serif;font-size:14px;color:#333;line-height:1.6;">${html.replace(/\n/g, "<br>")}</body></html>`;

        const recipients = parseEmails(to);
        const results: { email: string; ok: boolean; messageId?: string; error?: string }[] = [];

        for (const recipient of recipients) {
          try {
            const trackingId = `leads-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            const finalHtml = htmlBody.replace("</body>", `${trackingPixel(trackingId)}</body>`);

            const info = await transporter.sendMail({
              from: smtpFrom,
              to: recipient,
              subject,
              html: finalHtml,
              text: html,
              replyTo: replyTo || "0mykembugua@gmail.com",
              headers: {
                "X-Mailer": "Michaelsoft Leads",
                "List-Unsubscribe": `<mailto:${replyTo || "0mykembugua@gmail.com"}?subject=unsubscribe>`,
                "Precedence": "personal",
              },
            });

            results.push({ email: recipient, ok: true, messageId: info.messageId || undefined });

            if (leadId) {
              const textContent = html
                .replace(/<br\s*\/?>/gi, "\n")
                .replace(/<\/?p[^>]*>/gi, "\n")
                .replace(/<[^>]*>/g, "")
                .replace(/&nbsp;/g, " ")
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/\n{3,}/g, "\n\n")
                .trim();
              await prisma.message.create({
                data: {
                  leadId: Number(leadId),
                  direction: "outgoing",
                  from: smtpFrom,
                  to: recipient,
                  subject,
                  content: textContent,
                  messageId: info.messageId || null,
                },
              });
            }
          } catch (sendErr: any) {
            console.error(`Failed to send to ${recipient}:`, sendErr.message);
            results.push({ email: recipient, ok: false, error: sendErr.message });
          }
        }

        if (leadId) {
          await prisma.lead.update({
            where: { id: Number(leadId) },
            data: { status: "contacted" },
          });
          await prisma.activity.create({
            data: { leadId: Number(leadId), type: "email_sent", detail: `Sent to ${recipients.join(", ")}` },
          });
        }

        const allOk = results.every((r) => r.ok);
        return NextResponse.json({
          ok: allOk,
          results,
          sentCount: results.filter((r) => r.ok).length,
          failedCount: results.filter((r) => !r.ok).length,
          provider: "smtp",
        });
      } catch (smtpError: any) {
        console.error("SMTP failed:", smtpError.message);
      }
    }

    return NextResponse.json({ error: "No email provider configured" }, { status: 500 });
  } catch (error: any) {
    console.error("Send email error:", error);
    return NextResponse.json({ error: error.message || "Failed to send email" }, { status: 500 });
  }
}
