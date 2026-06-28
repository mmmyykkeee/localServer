import { NextResponse } from "next/server";
import { syncEmailReplies } from "@/lib/email-sync";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({ where: { email: { not: null } }, select: { id: true, email: true } });
    console.log("Known lead emails:", leads.map((l) => l.email));
    const result = await syncEmailReplies();
    console.log("Sync result:", result);
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("IMAP sync error:", error.message, error.stack);
    return NextResponse.json({ error: error.message || "Sync failed" }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
