import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";

export async function GET() {
  const guard = await requireRole([UserRole.MANAGER]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const orders = await prisma.order.findMany({
    include: {
      outlet: { include: { outletProfile: true } },
      items: true,
      assignedCourier: { select: { id: true, name: true, email: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json(orders);
}
