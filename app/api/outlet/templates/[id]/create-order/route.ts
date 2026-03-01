import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { resolveDeliveryDate } from "@/lib/delivery";
import { normalizeOrderItems } from "@/lib/order";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole([UserRole.OUTLET]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;
  const body = (await req.json()) as { deliveryType?: "TODAY" | "TOMORROW" | "CUSTOM"; deliveryDate?: string; note?: string };
  const deliveryType = body.deliveryType || "TODAY";

  const template = await prisma.orderTemplate.findFirst({
    where: { id, companyId: guard.companyId, outletId: guard.session.user.id },
    include: { items: { include: { product: true } } }
  });

  if (!template || template.items.length === 0) {
    return NextResponse.json({ error: "Shablon topilmadi" }, { status: 404 });
  }

  const productMap = new Map(template.items.map((item) => [item.productId, item.product]));
  const normalizedItems = normalizeOrderItems(
    template.items.map((item) => ({ productId: item.productId, qty: item.qty })),
    productMap
  );

  if (normalizedItems.length === 0) {
    return NextResponse.json({ error: "Shablondagi mahsulotlar yaroqsiz" }, { status: 400 });
  }

  const order = await prisma.order.create({
    data: {
      companyId: guard.companyId,
      outletId: guard.session.user.id,
      deliveryDate: resolveDeliveryDate(deliveryType, body.deliveryDate),
      note: body.note,
      totalQty: normalizedItems.reduce((sum, item) => sum + item.qty, 0),
      items: {
        create: normalizedItems.map((item) => {
          const product = productMap.get(item.productId)!;
          return {
            productId: item.productId,
            qty: item.qty,
            unitSnapshot: product.unit,
            nameSnapshot: product.name
          };
        })
      }
    }
  });

  return NextResponse.json({ id: order.id }, { status: 201 });
}
