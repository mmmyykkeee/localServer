import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activities = await prisma.activity.findMany({
    where: { leadId: Number(id) },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json(activities);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { type, detail } = await req.json();
  const activity = await prisma.activity.create({
    data: { leadId: Number(id), type, detail: detail || null },
  });
  return NextResponse.json(activity, { status: 201 });
}
