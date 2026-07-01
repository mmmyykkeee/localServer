import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [total, newLeads, contacted, followedUp, enriched, emailsSent, emailsOpened, followUpDue] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.count({ where: { status: "new" } }),
    prisma.lead.count({ where: { status: "contacted" } }),
    prisma.lead.count({ where: { status: "contacted", updatedAt: { gte: sevenDaysAgo } } }),
    prisma.lead.count({ where: { enriched: { not: null } } }),
    prisma.message.count({ where: { direction: "outgoing", subject: { not: "WhatsApp" }, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.message.count({ where: { direction: "outgoing", subject: { not: "WhatsApp" }, opened: true } }),
    prisma.lead.count({ where: { followUpAt: { lte: now }, status: { not: "unresponsive" } } }),
  ]);

  const avgScore = await prisma.lead.aggregate({ _avg: { score: true } });

  return NextResponse.json({
    total,
    new: newLeads,
    contacted,
    followedUp,
    enriched,
    emailsSent,
    emailsOpened,
    openRate: emailsSent > 0 ? Math.round((emailsOpened / emailsSent) * 100) : 0,
    followUpDue,
    avgScore: Math.round(avgScore._avg.score || 0),
  });
}
