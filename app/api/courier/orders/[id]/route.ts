import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireRole([UserRole.COURIER]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await params;
  const order = await prisma.order.findFirst({
    where: { id, companyId: guard.companyId, assignedCourierId: guard.session.user.id },
    include: {
      items: true,
      outlet: { include: { outletProfile: true } }
    }
  });

  if (!order) return NextResponse.json({ error: "Buyurtma topilmadi" }, { status: 404 });
  return NextResponse.json(order);
}
