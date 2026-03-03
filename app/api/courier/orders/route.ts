import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { optimizeCourierRoute } from "@/lib/ai";

export async function GET() {
  const guard = await requireRole([UserRole.COURIER]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const orders = await prisma.order.findMany({
    where: { companyId: guard.companyId, assignedCourierId: guard.session.user.id },
    include: {
      items: true,
      outlet: { include: { outletProfile: true } }
    },
    orderBy: { deliveryDate: "asc" }
  });

  const suggestedRoute = optimizeCourierRoute(orders);
  return NextResponse.json({ orders, suggestedRoute });
}
