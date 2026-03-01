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
  const order = await prisma.order.findFirst({ where: { id, assignedCourierId: guard.session.user.id } });

  if (!order) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });

  const canPickUp: OrderStatus[] = [OrderStatus.ASSIGNED, OrderStatus.READY];
  if (parsed.data.status === "PICKED_UP" && !canPickUp.includes(order.status)) {
    return NextResponse.json({ error: "Bu statusga o'tkazib bo'lmaydi" }, { status: 400 });
  }

  const canDeliver: OrderStatus[] = [OrderStatus.PICKED_UP, OrderStatus.OUT_FOR_DELIVERY];
  if (parsed.data.status === "DELIVERED" && !canDeliver.includes(order.status)) {
    return NextResponse.json({ error: "Avval PICKED_UP bo'lishi kerak" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: parsed.data.status === "PICKED_UP" ? OrderStatus.PICKED_UP : OrderStatus.DELIVERED
    }
  });

  return NextResponse.json(updated);
}
