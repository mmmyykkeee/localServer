import { prisma } from "@/lib/prisma";
import { createLead, deleteLead, updateLead } from "./actions";
import LeadsClient from "./LeadsClient";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 8;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string; s?: string }> }) {
  const { q, page, s } = await searchParams;
  const currentPage = Math.max(1, Number(page) || 1);
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
  for (const leadId of leadIds) {
    const lastMsg = await prisma.message.findFirst({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      select: { direction: true },
    });
    if (lastMsg?.direction === "incoming") {
      const incomingCount = await prisma.message.count({
        where: { leadId, direction: "incoming" },
      });
      unreadCounts[leadId] = incomingCount;
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
    />
  );
}
