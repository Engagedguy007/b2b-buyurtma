import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { managerOrderUpdateSchema } from "@/lib/validations";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole([UserRole.OWNER]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const parsed = managerOrderUpdateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id } = await params;
  const data = parsed.data;

  if (data.status === "REJECTED" && !data.rejectionReason) {
    return NextResponse.json({ error: "Rad etish sababi kerak" }, { status: 400 });
  }

  const order = await prisma.order.findFirst({ where: { id, companyId: guard.companyId } });
  if (!order) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });

  if (data.assignedCourierId) {
    const courier = await prisma.user.findFirst({
      where: { id: data.assignedCourierId, companyId: guard.companyId, role: UserRole.COURIER, isActive: true }
    });
    if (!courier) return NextResponse.json({ error: "Kurer topilmadi" }, { status: 400 });
  }

  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: data.status,
      rejectionReason: data.status === "REJECTED" ? data.rejectionReason || null : null,
      assignedCourierId: data.assignedCourierId || null,
      deliveryDate: data.deliveryDate ? new Date(data.deliveryDate) : undefined,
      confirmedAt: data.status === "CONFIRMED" ? new Date() : undefined
    }
  });

  return NextResponse.json(updated);
}
