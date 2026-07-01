import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const search = req.nextUrl.searchParams.get("q");
    const status = req.nextUrl.searchParams.get("s");
    const tag = req.nextUrl.searchParams.get("tag");

    const conditions: Record<string, unknown>[] = [];
    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { website: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      });
    }
    if (status) conditions.push({ status });
    if (tag) conditions.push({ tags: { contains: tag } });

    const where = conditions.length > 0 ? { AND: conditions } : undefined;
    const leads = await prisma.lead.findMany({ where, orderBy: { createdAt: "desc" } });

    const header = "name,company,email,phone,website,status,tags,notes";
    const rows = leads.map((l) =>
      [l.name, l.company, l.email, l.phone, l.website, l.status, l.tags, l.notes]
        .map((v) => `"${(v || "").replace(/"/g, '""')}"`)
        .join(",")
    );

    const csv = [header, ...rows].join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="leads-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
