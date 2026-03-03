import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { getSuggestedOrder } from "@/lib/ai";

export async function GET() {
  const guard = await requireRole([UserRole.OUTLET]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const suggestions = await getSuggestedOrder(guard.session.user.id, guard.companyId);
  return NextResponse.json({ suggestions });
}
