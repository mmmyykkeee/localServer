"use client";

import Link from "next/link";
import Image from "next/image";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  AreaChart, Area,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  RadialBarChart, RadialBar,
} from "recharts";

interface AnalyticsProps {
  totalLeads: number;
  contacted: number;
  unresponsive: number;
  newLeads: number;
  totalMessages: number;
  outgoing: number;
  incoming: number;
  totalDrafts: number;
  usedDrafts: number;
  leadsByMonth: { month: string; leads: number }[];
  messagesByMonth: { month: string; sent: number; received: number }[];
  statusData: { name: string; value: number; color: string }[];
  topCompanies: { name: string; count: number }[];
  responseRate: string;
  contactRate: string;
  draftUsage: string;
}

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#6366f1"];

export default function AnalyticsClient({
  totalLeads, contacted, unresponsive, newLeads,
  totalMessages, outgoing, incoming,
  totalDrafts, usedDrafts,
  leadsByMonth, messagesByMonth, statusData, topCompanies,
  responseRate, contactRate, draftUsage,
}: AnalyticsProps) {
  const stats = [
    { label: "Total Leads", value: totalLeads, color: "text-neutral-900 dark:text-white" },
    { label: "Contacted", value: contacted, color: "text-emerald-600 dark:text-emerald-400" },
    { label: "Messages Sent", value: outgoing, color: "text-blue-600 dark:text-blue-400" },
    { label: "Messages Received", value: incoming, color: "text-purple-600 dark:text-purple-400" },
    { label: "Response Rate", value: `${responseRate}%`, color: "text-amber-600 dark:text-amber-400" },
    { label: "Contact Rate", value: `${contactRate}%`, color: "text-emerald-600 dark:text-emerald-400" },
  ];

  const radialData = [
    { name: "Drafts Used", value: Number(draftUsage), fill: "#10b981" },
    { name: "Contact Rate", value: Number(contactRate), fill: "#3b82f6" },
    { name: "Response Rate", value: Number(responseRate), fill: "#f59e0b" },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <nav className="mb-6 flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
          <Link href="/" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Home</Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <Link href="/leads" className="hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors">Leads</Link>
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <span className="text-neutral-600 dark:text-neutral-300 font-medium">Analytics</span>
        </nav>

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-3">
            <Image src="https://michaelsoft.co.ke/favicon.png" alt="MichaelSoft" width={28} height={28} className="rounded-md dark:brightness-90" unoptimized />
            <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">Analytics</h1>
          </div>
          <p className="mt-2 text-neutral-500 dark:text-neutral-400 text-sm">Overview of your leads pipeline and email performance.</p>
        </div>

        {/* ─── Stats Cards ─── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-12">
          {stats.map((s) => (
            <div key={s.label} className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-4">
              <span className="text-xs text-neutral-500 dark:text-neutral-400 block mb-1">{s.label}</span>
              <span className={`text-2xl font-semibold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* ─── Charts Row 1 ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Leads by Month */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-4">Leads by Month</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={leadsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" className="dark:stroke-neutral-800" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#a3a3a3" />
                <YAxis tick={{ fontSize: 12 }} stroke="#a3a3a3" />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e5e5", fontSize: "12px" }} />
                <Bar dataKey="leads" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Messages Over Time */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-4">Messages Over Time</h3>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={messagesByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" className="dark:stroke-neutral-800" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#a3a3a3" />
                <YAxis tick={{ fontSize: 12 }} stroke="#a3a3a3" />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e5e5", fontSize: "12px" }} />
                <Legend />
                <Area type="monotone" dataKey="sent" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                <Area type="monotone" dataKey="received" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ─── Charts Row 2 ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Status Distribution */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-4">Lead Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {statusData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e5e5", fontSize: "12px" }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Top Companies */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-4">Top Companies</h3>
            <div className="space-y-2.5">
              {topCompanies.map((company, i) => {
                const maxCount = topCompanies[0]?.count || 1;
                const width = (company.count / maxCount) * 100;
                return (
                  <div key={company.name} className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500 dark:text-neutral-400 w-36 truncate text-right shrink-0" title={company.name}>{company.name}</span>
                    <div className="flex-1 h-6 bg-neutral-100 dark:bg-neutral-800 rounded-md overflow-hidden">
                      <div className="h-full rounded-md transition-all duration-500" style={{ width: `${width}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                    </div>
                    <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300 w-6 text-right shrink-0">{company.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Performance Radial */}
          <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-4">Performance</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" barSize={14} data={radialData} startAngle={180} endAngle={0}>
                <PolarGrid radialLines={false} />
                <RadialBar dataKey="value" cornerRadius={4} background={{ fill: "#f5f5f5" }} />
                <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e5e5e5", fontSize: "12px" }} formatter={(value: any) => `${value}%`} />
                <Legend />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ─── Summary ─── */}
        <div className="border border-neutral-200 dark:border-neutral-800 rounded-xl p-6">
          <h3 className="text-sm font-medium text-neutral-900 dark:text-neutral-100 mb-4">Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
            <div>
              <span className="text-neutral-500 dark:text-neutral-400 block mb-1">Draft Usage</span>
              <span className="text-neutral-900 dark:text-neutral-100 font-medium">{usedDrafts} / {totalDrafts} drafts used ({draftUsage}%)</span>
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-400 block mb-1">Conversation Depth</span>
              <span className="text-neutral-900 dark:text-neutral-100 font-medium">{totalLeads > 0 ? (totalMessages / totalLeads).toFixed(1) : 0} messages per lead</span>
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-400 block mb-1">Inbox vs Outbox</span>
              <span className="text-neutral-900 dark:text-neutral-100 font-medium">{outgoing} sent / {incoming} received</span>
            </div>
            <div>
              <span className="text-neutral-500 dark:text-neutral-400 block mb-1">Conversion</span>
              <span className="text-neutral-900 dark:text-neutral-100 font-medium">{contacted} of {totalLeads} contacted ({contactRate}%)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
