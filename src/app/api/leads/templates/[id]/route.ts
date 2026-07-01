import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { name, subject, content, tone, purpose } = await req.json();
  const template = await prisma.emailTemplate.update({
    where: { id: Number(id) },
    data: { name, subject, content, tone: tone || null, purpose: purpose || null },
  });
  return NextResponse.json(template);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.emailTemplate.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
