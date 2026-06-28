import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const messages = await prisma.message.findMany();
    let cleaned = 0;
    for (const msg of messages) {
      const cleaned_content = msg.content.replace(/^>\s?/gm, "").replace(/\n>\s?/g, "\n").trim();
      if (cleaned_content !== msg.content) {
        await prisma.message.update({
          where: { id: msg.id },
          data: { content: cleaned_content },
        });
        cleaned++;
      }
    }
    return NextResponse.json({ ok: true, cleaned });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
