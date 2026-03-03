import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { requireRole } from "@/lib/guards";
import { forecastDemand } from "@/lib/ai";

export async function GET(req: Request) {
  const guard = await requireRole([UserRole.OWNER]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { searchParams } = new URL(req.url);
  const days = Math.min(14, Math.max(1, Number(searchParams.get("days") || 7)));
  const forecast = await forecastDemand(guard.companyId, days);

  return NextResponse.json({ forecast, days });
}
