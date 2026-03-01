import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guards";
import { inviteCreateSchema } from "@/lib/validations";

function generatePin() {
  return `${Math.floor(1000 + Math.random() * 9000)}`;
}

export async function GET() {
  const guard = await requireRole([UserRole.MANAGER]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const invites = await prisma.outletInvite.findMany({
    where: { companyId: guard.companyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      token: true,
      outletName: true,
      phone: true,
      address: true,
      region: true,
      expiresAt: true,
      usedAt: true,
      createdAt: true
    }
  });

  return NextResponse.json(invites);
}

export async function POST(req: Request) {
  const guard = await requireRole([UserRole.MANAGER]);
  if ("error" in guard) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const parsed = inviteCreateSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const pin = generatePin();
  const pinHash = await bcrypt.hash(pin, 10);
  const token = randomBytes(12).toString("hex");
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000);

  const invite = await prisma.outletInvite.create({
    data: {
      companyId: guard.companyId,
      createdById: guard.session.user.id,
      token,
      pinHash,
      outletName: parsed.data.outletName,
      phone: parsed.data.phone,
      address: parsed.data.address,
      region: parsed.data.region,
      expiresAt
    }
  });

  return NextResponse.json(
    {
      id: invite.id,
      token: invite.token,
      pin,
      joinUrl: `/join/${invite.token}`,
      expiresAt: invite.expiresAt
    },
    { status: 201 }
  );
}
