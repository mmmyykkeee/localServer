import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const msg = await prisma.message.findUnique({ where: { id: Number(id) }, select: { messageId: true } });
    if (msg?.messageId) {
      const existing = await prisma.deletedMessage.findFirst({ where: { messageId: msg.messageId } });
      if (!existing) {
        await prisma.deletedMessage.create({ data: { messageId: msg.messageId } });
      }
    }
    await prisma.message.delete({ where: { id: Number(id) } });
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
