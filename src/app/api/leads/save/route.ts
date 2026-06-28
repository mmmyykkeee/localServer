import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { id, field, value } = await req.json();

  if (!id || !field) {
    return NextResponse.json({ error: "id and field required" }, { status: 400 });
  }

  const allowed = ["name", "company", "email", "phone", "notes", "website", "status", "response"];
  if (!allowed.includes(field)) {
    return NextResponse.json({ error: "Invalid field" }, { status: 400 });
  }

  const lead = await prisma.lead.update({
    where: { id: Number(id) },
    data: { [field]: value || null },
  });

  return NextResponse.json({ ok: true, lead });
}
