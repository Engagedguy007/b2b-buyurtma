import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { quickOrderSchema } from "@/lib/validations";
import { resolveDeliveryDate } from "@/lib/delivery";
import { normalizeOrderItems } from "@/lib/order";

export async function POST(req: Request) {
  const guard = await requireRole([UserRole.OUTLET]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const parsed = quickOrderSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { items, note, deliveryType, deliveryDate } = parsed.data;
  const outletId = guard.session.user.id;
  const companyId = guard.companyId;

  const products = await prisma.product.findMany({
    where: { companyId, id: { in: items.map((item) => item.productId) }, isActive: true }
  });
  const productMap = new Map(products.map((product) => [product.id, product]));

  try {
    const normalizedItems = normalizeOrderItems(items, productMap);
    if (normalizedItems.length === 0) {
      return NextResponse.json({ error: "Kamida bitta mahsulot tanlang" }, { status: 400 });
    }

    const order = await prisma.order.create({
      data: {
        companyId,
        outletId,
        deliveryDate: resolveDeliveryDate(deliveryType, deliveryDate),
        note,
        totalQty: normalizedItems.reduce((sum, item) => sum + item.qty, 0),
        items: {
          create: normalizedItems.map((item) => {
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

export async function GET() {
  const guard = await requireRole([UserRole.OUTLET]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const outletId = guard.session.user.id;
  const companyId = guard.companyId;
  const orders = await prisma.order.findMany({
    where: { companyId, outletId },
    include: { items: true },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(orders);
}
