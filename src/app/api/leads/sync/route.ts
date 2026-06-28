import { NextResponse } from "next/server";
import { syncEmailReplies } from "@/lib/email-sync";

export async function GET() {
  try {
    const result = await syncEmailReplies();
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error("IMAP sync error:", error);
    return NextResponse.json({ error: error.message || "Sync failed" }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}
