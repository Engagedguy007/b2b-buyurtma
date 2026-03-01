import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";

const schema = z.object({
  productId: z.string().cuid(),
  favorite: z.boolean()
});

export async function POST(req: Request) {
  const guard = await requireRole([UserRole.OUTLET]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const parsed = schema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { productId, favorite } = parsed.data;
  const outletId = guard.session.user.id;
  const companyId = guard.companyId;

  if (favorite) {
    await prisma.favoriteProduct.upsert({
      where: { outletId_productId: { outletId, productId } },
      update: { companyId },
      create: { companyId, outletId, productId }
    });
  } else {
    await prisma.favoriteProduct.deleteMany({ where: { companyId, outletId, productId } });
  }

  return NextResponse.json({ ok: true });
}
