import { prisma } from "@/lib/prisma";
import AnalyticsClient from "./AnalyticsClient";

export default async function AnalyticsPage() {
  const [leads, messages, drafts] = await Promise.all([
    prisma.lead.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.message.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.emailDraft.findMany({ orderBy: { createdAt: "asc" } }),
  ]);

  const totalLeads = leads.length;
  const contacted = leads.filter((l) => l.status === "contacted").length;
  const unresponsive = leads.filter((l) => l.status === "unresponsive").length;
  const newLeads = leads.filter((l) => l.status === "new" || !l.status).length;
  const totalMessages = messages.length;
  const outgoing = messages.filter((m) => m.direction === "outgoing").length;
  const incoming = messages.filter((m) => m.direction === "incoming").length;
  const totalDrafts = drafts.length;
  const usedDrafts = drafts.filter((d) => d.used).length;

  const now = new Date();
  const currentMonth = now.getMonth();

  const leadsByMonth: { month: string; leads: number }[] = [];
  for (let i = Math.max(0, currentMonth - 5); i <= currentMonth; i++) {
    const month = new Date(2026, i, 1).toLocaleString("default", { month: "short" });
    const count = leads.filter((l) => new Date(l.createdAt).getMonth() === i).length;
    leadsByMonth.push({ month, leads: count });
  }

  const messagesByMonth: { month: string; sent: number; received: number }[] = [];
  for (let i = Math.max(0, currentMonth - 5); i <= currentMonth; i++) {
    const month = new Date(2026, i, 1).toLocaleString("default", { month: "short" });
    const sent = messages.filter((m) => m.direction === "outgoing" && new Date(m.createdAt).getMonth() === i).length;
    const received = messages.filter((m) => m.direction === "incoming" && new Date(m.createdAt).getMonth() === i).length;
    messagesByMonth.push({ month, sent, received });
  }

  const statusData = [
    { name: "New", value: newLeads, color: "#a3a3a3" },
    { name: "Contacted", value: contacted, color: "#10b981" },
    { name: "Unresponsive", value: unresponsive, color: "#f59e0b" },
  ].filter((s) => s.value > 0);

  const companyCount: Record<string, number> = {};
  for (const l of leads) {
    const company = l.company || "Unknown";
    companyCount[company] = (companyCount[company] || 0) + 1;
  }
  const topCompanies = Object.entries(companyCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 20) + "..." : name, count }));

  const responseRate = totalLeads > 0 ? ((incoming / totalLeads) * 100).toFixed(1) : "0";
  const contactRate = totalLeads > 0 ? ((contacted / totalLeads) * 100).toFixed(1) : "0";
  const draftUsage = totalDrafts > 0 ? ((usedDrafts / totalDrafts) * 100).toFixed(1) : "0";

  return (
    <AnalyticsClient
      totalLeads={totalLeads}
      contacted={contacted}
      unresponsive={unresponsive}
      newLeads={newLeads}
      totalMessages={totalMessages}
      outgoing={outgoing}
      incoming={incoming}
      totalDrafts={totalDrafts}
      usedDrafts={usedDrafts}
      leadsByMonth={leadsByMonth}
      messagesByMonth={messagesByMonth}
      statusData={statusData}
      topCompanies={topCompanies}
      responseRate={responseRate}
      contactRate={contactRate}
      draftUsage={draftUsage}
    />
  );
}
