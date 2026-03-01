import { NextResponse } from "next/server";
import { OrderStatus, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { courierStatusUpdateSchema } from "@/lib/validations";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole([UserRole.COURIER]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const parsed = courierStatusUpdateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, companyId: guard.companyId, assignedCourierId: guard.session.user.id }
  });

  if (!order) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });

  const transition = parsed.data.status;
  const canPickUp: OrderStatus[] = [OrderStatus.ASSIGNED, OrderStatus.READY];
  if (transition === "PICKED_UP" && !canPickUp.includes(order.status)) {
    return NextResponse.json({ error: "Avval ASSIGNED/READY bo'lishi kerak" }, { status: 400 });
  }
  if (transition === "OUT_FOR_DELIVERY" && order.status !== OrderStatus.PICKED_UP) {
    return NextResponse.json({ error: "Avval QABUL QILDIM bosing" }, { status: 400 });
  }
  if (transition === "DELIVERED" && order.status !== OrderStatus.OUT_FOR_DELIVERY) {
    return NextResponse.json({ error: "Avval YO'LDA bosing" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status:
        transition === "PICKED_UP"
          ? OrderStatus.PICKED_UP
          : transition === "OUT_FOR_DELIVERY"
            ? OrderStatus.OUT_FOR_DELIVERY
            : OrderStatus.DELIVERED
    }
  });

  return NextResponse.json(updated);
}
