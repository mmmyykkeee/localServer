import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { csv } = await req.json();
    if (!csv) return NextResponse.json({ error: "CSV data required" }, { status: 400 });

    const lines = csv.split("\n").filter((l: string) => l.trim());
    if (lines.length < 2) return NextResponse.json({ error: "CSV must have a header row and at least one data row" }, { status: 400 });

    const headers = lines[0].split(",").map((h: string) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));
    const results: { row: number; status: string; name?: string }[] = [];
    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v: string) => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((h: string, idx: number) => { row[h] = values[idx] || ""; });

      const name = row.name || row.company || "";
      const email = row.email || "";
      const phone = row.phone || "";
      const website = row.website || row.url || "";
      const company = row.company || "";

      if (!name && !email && !phone && !website) {
        results.push({ row: i + 1, status: "skipped" });
        skipped++;
        continue;
      }

      const orConditions: Record<string, string>[] = [];
      if (email) orConditions.push({ email });
      if (website) orConditions.push({ website });
      if (phone) orConditions.push({ phone });

      if (orConditions.length > 0) {
        const existing = await prisma.lead.findFirst({ where: { OR: orConditions } });
        if (existing) {
          results.push({ row: i + 1, status: "duplicate", name });
          skipped++;
          continue;
        }
      }

      await prisma.lead.create({ data: { name: name || null, email: email || null, phone: phone || null, website: website || null, company: company || null } });
      results.push({ row: i + 1, status: "imported", name });
      imported++;
    }

    return NextResponse.json({ ok: true, imported, skipped, total: lines.length - 1, results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
