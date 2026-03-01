import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { reorderSchema } from "@/lib/validations";
import { resolveDeliveryDate } from "@/lib/delivery";

export async function POST(req: Request) {
  const guard = await requireRole([UserRole.OUTLET]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const parsed = reorderSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const outletId = guard.session.user.id;
  let items = parsed.data.items;

  if (!items || items.length === 0) {
    const baseOrder = parsed.data.orderId
      ? await prisma.order.findFirst({ where: { id: parsed.data.orderId, outletId }, include: { items: true } })
      : await prisma.order.findFirst({ where: { outletId }, include: { items: true }, orderBy: { createdAt: "desc" } });

    if (!baseOrder) return NextResponse.json({ error: "Qayta buyurtma uchun order topilmadi" }, { status: 404 });
    items = baseOrder.items.map((item) => ({ productId: item.productId, qty: item.qty }));
  }

  const products = await prisma.product.findMany({ where: { id: { in: items.map((item) => item.productId) }, isActive: true } });
  const productMap = new Map(products.map((product) => [product.id, product]));

  for (const item of items) {
    const product = productMap.get(item.productId);
    if (!product) return NextResponse.json({ error: "Mahsulot topilmadi" }, { status: 404 });
    if (product.minOrderQty && item.qty < product.minOrderQty) {
      return NextResponse.json({ error: `${product.name}: kamida ${product.minOrderQty}` }, { status: 400 });
    }
    if (product.packSize && item.qty % product.packSize !== 0) {
      return NextResponse.json({ error: `${product.name}: ${product.packSize} ga karrali bo'lsin` }, { status: 400 });
    }
  }

  try {
    const order = await prisma.order.create({
      data: {
        outletId,
        deliveryDate: resolveDeliveryDate(parsed.data.deliveryType, parsed.data.deliveryDate),
        note: parsed.data.note,
        totalQty: items.reduce((sum, item) => sum + item.qty, 0),
        items: {
          create: items.map((item) => {
            const product = productMap.get(item.productId)!;
            return {
              productId: product.id,
              qty: item.qty,
              unitSnapshot: product.unit,
              nameSnapshot: product.name
            };
          })
        }
      }
    });

    return NextResponse.json({ id: order.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}
