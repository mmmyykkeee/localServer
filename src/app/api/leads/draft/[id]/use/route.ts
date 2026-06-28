import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.emailDraft.update({
      where: { id: parseInt(id) },
      data: { used: true },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Failed to mark draft as used:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
