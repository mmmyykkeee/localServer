import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function calculateScore(lead: any): number {
  let score = 0;
  if (lead.email) score += 20;
  if (lead.phone) score += 15;
  if (lead.website) score += 10;
  if (lead.company) score += 10;
  if (lead.enriched) {
    try {
      const e = JSON.parse(lead.enriched);
      if (e.emails?.length > 1) score += 10;
      if (e.phones?.length > 0) score += 5;
      if (e.description) score += 10;
      if (Object.keys(e.socialLinks || {}).length > 0) score += 10;
    } catch {}
  }
  if (lead.status === "contacted") score += 5;
  return Math.min(100, score);
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await prisma.lead.findUnique({ where: { id: Number(id) } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const score = calculateScore(lead);
  await prisma.lead.update({ where: { id: Number(id) }, data: { score } });
  return NextResponse.json({ score });
}
