import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function cleanContent(content: string): string {
  return content
    .replace(/^>\s?/gm, "")
    .replace(/\n>\s?/g, "\n")
    .replace(/On (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),? \d{1,2} \w+ \d{4} at \d{1,2}:\d{2} [AP]M,?.*wrote:[\s\S]*$/, "")
    .replace(/On \d{1,2}\/\d{1,2}\/\d{4},? .*wrote:[\s\S]*$/, "")
    .replace(/On \w+ \d{1,2},? \d{4},? at \d{1,2}:\d{2}.*wrote:[\s\S]*$/, "")
    .replace(/_{3,}/g, "")
    .replace(/-{3,}/g, "")
    .trim();
}

export async function POST() {
  try {
    const messages = await prisma.message.findMany();
    let cleaned = 0;
    for (const msg of messages) {
      const cleanedContent = cleanContent(msg.content);
      if (cleanedContent !== msg.content) {
        await prisma.message.update({
          where: { id: msg.id },
          data: { content: cleanedContent },
        });
        cleaned++;
      }
    }
    return NextResponse.json({ ok: true, cleaned });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
