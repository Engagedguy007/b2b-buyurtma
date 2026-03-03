import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";

export async function GET() {
  const guard = await requireRole([UserRole.OWNER]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const couriers = await prisma.user.findMany({
    where: { companyId: guard.companyId, role: UserRole.COURIER, isActive: true },
    select: { id: true, name: true, email: true }
  });

  return NextResponse.json(couriers);
}
