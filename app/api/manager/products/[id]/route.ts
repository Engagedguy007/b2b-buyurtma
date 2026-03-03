import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { productUpdateSchema } from "@/lib/validations";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole([UserRole.OWNER]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const parsed = productUpdateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id } = await params;
  const product = await prisma.product.findFirst({ where: { id, companyId: guard.companyId } });
  if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });

  const updated = await prisma.product.update({
    where: { id },
    data: {
      ...parsed.data,
      price: parsed.data.price ?? undefined,
      packSize: parsed.data.packSize ?? undefined,
      minOrderQty: parsed.data.minOrderQty ?? undefined
    }
  });

  return NextResponse.json(updated);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole([UserRole.OWNER]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;
  const product = await prisma.product.findFirst({ where: { id, companyId: guard.companyId } });
  if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });

  await prisma.product.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
