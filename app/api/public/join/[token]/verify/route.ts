import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { inviteVerifySchema } from "@/lib/validations";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const parsed = inviteVerifySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const invite = await prisma.outletInvite.findUnique({
    where: { token },
    include: { company: true }
  });

  if (!invite) return NextResponse.json({ error: "Taklif topilmadi" }, { status: 404 });
  if (invite.usedAt) return NextResponse.json({ error: "Taklif ishlatilgan" }, { status: 400 });
  if (invite.expiresAt < new Date()) return NextResponse.json({ error: "Taklif muddati tugagan" }, { status: 400 });

  const ok = await bcrypt.compare(parsed.data.pin, invite.pinHash);
  if (!ok) return NextResponse.json({ error: "PIN noto'g'ri" }, { status: 400 });

  return NextResponse.json({
    ok: true,
    invite: {
      token: invite.token,
      outletName: invite.outletName,
      phone: invite.phone,
      address: invite.address,
      region: invite.region,
      companyName: invite.company.name,
      companySlug: invite.company.slug,
      defaultLocale: invite.company.defaultLocale,
      expiresAt: invite.expiresAt
    }
  });
}
