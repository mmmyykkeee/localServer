import { prisma } from "@/lib/prisma";
import { createLead, deleteLead, updateLead } from "./actions";
import LeadsClient from "./LeadsClient";

export const dynamic = "force-dynamic";

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; s?: string; size?: string }> }) {
  const { q, page, s, size } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
  const PAGE_SIZE = Math.max(1, Math.min(100, Number(size) || 10));
  const statusFilter = s === "contacted" || s === "unresponsive" ? s : "";

  const conditions: Record<string, unknown>[] = [];

  if (q) {
    conditions.push({
      OR: [
        { name: { contains: q, mode: "insensitive" } },
        { company: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { website: { contains: q, mode: "insensitive" } },
        { phone: { contains: q, mode: "insensitive" } },
      ],
    });
  }

  if (statusFilter) {
    conditions.push({ status: statusFilter });
  }

  const where = conditions.length > 0 ? { AND: conditions } : undefined;

  const [leads, totalCount] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.lead.count({ where }),
  ]);

  const leadIds = leads.map((l) => l.id);

  const unreadCounts: Record<number, number> = {};
  if (leadIds.length > 0) {
    const lastViewedMap = new Map<number, Date>();
    for (const lead of leads) {
      lastViewedMap.set(lead.id, lead.lastViewedAt || lead.createdAt);
    }

    const incomingMessages = await prisma.message.findMany({
      where: {
        leadId: { in: leadIds },
        direction: "incoming",
      },
      select: { leadId: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });

    for (const msg of incomingMessages) {
      const lastViewed = lastViewedMap.get(msg.leadId);
      if (lastViewed && msg.createdAt > lastViewed) {
        unreadCounts[msg.leadId] = (unreadCounts[msg.leadId] || 0) + 1;
      }
    }
  }

  return (
    <LeadsClient
      leads={JSON.parse(JSON.stringify(leads))}
      createLead={createLead}
      deleteLead={deleteLead}
      updateLead={updateLead}
      totalCount={totalCount}
      currentPage={currentPage}
      pageSize={PAGE_SIZE}
      statusFilter={statusFilter}
      unreadCounts={unreadCounts}
      initialSearch={q || ""}
    />
  );
}
