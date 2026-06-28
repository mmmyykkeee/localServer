"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createLead(formData: FormData) {
  const website = formData.get("website") as string || null;
  const email = formData.get("email") as string || null;
  const phone = formData.get("phone") as string || null;
  const name = formData.get("name") as string || null;
  const company = formData.get("company") as string || null;
  const notes = formData.get("notes") as string || null;

  if (email || website || phone) {
    const orConditions: Record<string, string>[] = [];
    if (email) orConditions.push({ email });
    if (website) orConditions.push({ website });
    if (phone) orConditions.push({ phone });
    const existing = await prisma.lead.findFirst({ where: { OR: orConditions } });
    if (existing) {
      revalidatePath("/leads");
      return { error: `Lead already exists (${existing.name || existing.company || existing.email || existing.website})` };
    }
  }

  await prisma.lead.create({ data: { website, email, phone, name, company, notes } });
  revalidatePath("/leads");
}

export async function deleteLead(formData: FormData) {
  const id = Number(formData.get("id"));
  if (id) {
    await prisma.lead.delete({ where: { id } });
    revalidatePath("/leads");
  }
}

export async function updateLead(formData: FormData) {
  const id = Number(formData.get("id"));
  const field = formData.get("field") as string;
  const value = formData.get("value") as string;
  if (id && field) {
    await prisma.lead.update({ where: { id }, data: { [field]: value || null } });
    revalidatePath("/leads");
  }
}
