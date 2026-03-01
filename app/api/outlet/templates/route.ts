import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { templateCreateSchema } from "@/lib/validations";

export async function GET() {
  const guard = await requireRole([UserRole.OUTLET]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const templates = await prisma.orderTemplate.findMany({
    where: { outletId: guard.session.user.id },
    include: { items: { include: { product: true } } },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(templates);
}

export async function POST(req: Request) {
  const guard = await requireRole([UserRole.OUTLET]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const parsed = templateCreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const template = await prisma.orderTemplate.create({
    data: {
      outletId: guard.session.user.id,
      name: parsed.data.name,
      items: { create: parsed.data.items }
    },
    include: { items: true }
  });

  return NextResponse.json(template, { status: 201 });
}
