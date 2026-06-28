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

function plainTextToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .split("\n")
    .map((line) => `<p style="margin:0 0 12px 0;font-family:sans-serif;font-size:14px;color:#333;line-height:1.6;">${line || "&nbsp;"}</p>`)
    .join("");
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

        const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#fff;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    ${plainTextToHtml(html)}
  </div>
</body>
</html>`;

        const info = await transporter.sendMail({
          from: smtpFrom,
          to,
          subject,
          html: htmlBody,
          text: html,
          replyTo: replyTo || "0mykembugua@gmail.com",
          headers: {
            "X-Mailer": "Michaelsoft Leads",
            "List-Unsubscribe": `<mailto:${replyTo || "0mykembugua@gmail.com"}?subject=unsubscribe>`,
            "Precedence": "personal",
            "X-Auto-Response-Suppress": "OOF, AutoReply",
          },
        });

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
              to,
              subject,
              content: textContent,
              messageId: info.messageId || null,
            },
          });
          await prisma.lead.update({
            where: { id: Number(leadId) },
            data: { status: "contacted" },
          });
        }

        return NextResponse.json({ ok: true, messageId: info.messageId, provider: "smtp" });
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
