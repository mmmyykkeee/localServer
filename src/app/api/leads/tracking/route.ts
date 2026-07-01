import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const messageId = req.nextUrl.searchParams.get("mid");
  if (!messageId) return new NextResponse(null, { status: 404 });

  const pixel = Buffer.from(
    "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
    "base64"
  );

  // Import dynamically to avoid issues
  const { prisma } = await import("@/lib/prisma");
  try {
    await prisma.message.updateMany({
      where: { messageId },
      data: { opened: true, openedAt: new Date() },
    });
  } catch {}

  return new NextResponse(pixel, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      Pragma: "no-cache",
    },
  });
}
