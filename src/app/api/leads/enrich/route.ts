import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface EnrichedData {
  title: string;
  description: string;
  emails: string[];
  phones: string[];
  socialLinks: Record<string, string>;
  fetchedAt: string;
}

export async function POST(req: NextRequest) {
  const { id, website } = await req.json();

  if (!website) {
    return NextResponse.json({ error: "Website URL required" }, { status: 400 });
  }

  try {
    const url = website.startsWith("http") ? website : `https://${website}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; LeadBot/1.0)" },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const descMatch =
      html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
    const ogTitle =
      html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
    const ogDesc =
      html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:description["']/i);

    // Extract emails
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const rawEmails = html.match(emailRegex) || [];
    const emails = [...new Set(rawEmails)].filter(
      (e) => !e.endsWith(".png") && !e.endsWith(".jpg") && !e.endsWith(".svg") && !e.includes("example.")
    );

    // Extract phone numbers from tel: links and contact sections
    const telLinkRegex = /href=["']tel:([^"']+)["']/g;
    const telLinks: string[] = [];
    let telMatch;
    while ((telMatch = telLinkRegex.exec(html)) !== null) {
      telLinks.push(telMatch[1].trim());
    }
    const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g;
    const rawPhones = [...telLinks, ...(html.match(phoneRegex) || [])];
    const phones = [...new Set(rawPhones)].filter((p) => {
      const digits = p.replace(/\D/g, "");
      return digits.length >= 7 && digits.length <= 15;
    }).slice(0, 5);

    // Extract social links
    const socialPatterns: Record<string, RegExp> = {
      linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[a-zA-Z0-9_-]+/g,
      twitter: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[a-zA-Z0-9_]+/g,
      facebook: /https?:\/\/(?:www\.)?facebook\.com\/[a-zA-Z0-9_.]+/g,
      instagram: /https?:\/\/(?:www\.)?instagram\.com\/[a-zA-Z0-9_.]+/g,
      github: /https?:\/\/(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/g,
    };
    const socialLinks: Record<string, string> = {};
    for (const [platform, pattern] of Object.entries(socialPatterns)) {
      const match = html.match(pattern);
      if (match) socialLinks[platform] = match[0];
    }

    const enriched: EnrichedData = {
      title: ogTitle?.[1] || titleMatch?.[1] || "",
      description: ogDesc?.[1] || descMatch?.[1] || "",
      emails,
      phones,
      socialLinks,
      fetchedAt: new Date().toISOString(),
    };

    if (id) {
      const lead = await prisma.lead.findUnique({ where: { id: Number(id) } });
      const updateData: Record<string, unknown> = { enriched: JSON.stringify(enriched) };

      if (emails.length > 0 && !lead?.email) updateData.email = emails[0];
      if (phones.length > 0 && !lead?.phone) updateData.phone = phones[0];

      await prisma.lead.update({ where: { id: Number(id) }, data: updateData });
    }

    return NextResponse.json(enriched);
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch website", details: String(e) },
      { status: 500 }
    );
  }
}
