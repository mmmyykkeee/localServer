import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const drafts = await prisma.emailDraft.findMany({
      where: { leadId: Number(id) },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(drafts);
  } catch (error) {
    console.error("Failed to fetch drafts:", error);
    return NextResponse.json([], { status: 500 });
  }
}
