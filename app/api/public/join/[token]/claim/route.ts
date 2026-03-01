import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { inviteClaimSchema } from "@/lib/validations";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsed = inviteClaimSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const invite = await prisma.outletInvite.findUnique({
    where: { token },
    include: { company: true }
  });

  if (!invite) return NextResponse.json({ error: "Taklif topilmadi" }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: "Taklif ishlatilgan" }, { status: 400 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Taklif muddati tugagan" }, { status: 400 });

  const pinOk = await bcrypt.compare(parsed.data.pin, invite.pinHash);
  if (!pinOk) return NextResponse.json({ error: "PIN noto'g'ri" }, { status: 400 });

  const email = `outlet-${invite.token.slice(0, 8)}@join.local`;
  const passwordHash = await bcrypt.hash(parsed.data.pin, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      companyId: invite.companyId,
      name: parsed.data.name,
      role: UserRole.OUTLET,
      passwordHash,
      locale: parsed.data.locale,
      isActive: true
    },
    create: {
      companyId: invite.companyId,
      name: parsed.data.name,
      email,
      role: UserRole.OUTLET,
      passwordHash,
      locale: parsed.data.locale,
      isActive: true
    }
  });

  await prisma.outletProfile.upsert({
    where: { userId: user.id },
    update: {
      companyId: invite.companyId,
      outletName: invite.outletName,
      phone: invite.phone,
      address: invite.address,
      region: invite.region || ""
    },
    create: {
      companyId: invite.companyId,
      userId: user.id,
      outletName: invite.outletName,
      phone: invite.phone,
      address: invite.address,
      region: invite.region || ""
    }
  });

  await prisma.outletInvite.update({
    where: { id: invite.id },
    data: { usedAt: new Date() }
  });

  return NextResponse.json({
    ok: true,
    email,
    password: parsed.data.pin,
    redirectTo: "/outlet"
  });
}
