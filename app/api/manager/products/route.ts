import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { productCreateSchema } from "@/lib/validations";

export async function GET() {
  const guard = await requireRole([UserRole.OWNER]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const products = await prisma.product.findMany({
    where: { companyId: guard.companyId },
    orderBy: { createdAt: "desc" }
  });
  return NextResponse.json(products.map((p) => ({ ...p, price: p.price ? Number(p.price) : null })));
}

export async function POST(req: Request) {
  const guard = await requireRole([UserRole.OWNER]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const parsed = productCreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const product = await prisma.product.create({
    data: {
      companyId: guard.companyId,
      ...parsed.data,
      price: parsed.data.price ?? null,
      packSize: parsed.data.packSize ?? null,
      minOrderQty: parsed.data.minOrderQty ?? null
    }
  });

  return NextResponse.json(product, { status: 201 });
}
