import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const templates = await prisma.emailTemplate.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
  const { name, subject, content, tone, purpose } = await req.json();
  if (!name || !subject || !content) {
    return NextResponse.json({ error: "name, subject, and content required" }, { status: 400 });
  }
  const template = await prisma.emailTemplate.create({
    data: { name, subject, content, tone: tone || null, purpose: purpose || null },
  });
  return NextResponse.json(template, { status: 201 });
}
