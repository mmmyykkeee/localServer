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
        const info = await transporter.sendMail({ from: smtpFrom, to, subject, html, replyTo: replyTo || "0mykembugua@gmail.com" });

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
