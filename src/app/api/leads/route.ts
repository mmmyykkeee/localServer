import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("q");

  if (search) {
    const leads = await prisma.lead.findMany({
      where: {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { company: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { website: { contains: search, mode: "insensitive" } },
          { phone: { contains: search, mode: "insensitive" } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(leads);
  }

  const leads = await prisma.lead.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  const orConditions: Record<string, string>[] = [];
  if (body.email) orConditions.push({ email: body.email });
  if (body.website) orConditions.push({ website: body.website });
  if (body.phone) orConditions.push({ phone: body.phone });

  if (orConditions.length > 0) {
    const existing = await prisma.lead.findFirst({
      where: { OR: orConditions },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Duplicate", message: `Lead already exists (${existing.name || existing.company || existing.email || existing.website})`, existing },
        { status: 409 }
      );
    }
  }

  const lead = await prisma.lead.create({ data: body });
  return NextResponse.json(lead, { status: 201 });
}
