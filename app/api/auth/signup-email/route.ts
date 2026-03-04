import bcrypt from "bcrypt";
import { Locale, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone, verifyEmailOtp } from "@/lib/otp";
import { signupWithEmailOtpSchema } from "@/lib/validations";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  const parsed = signupWithEmailOtpSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const otpResult = await verifyEmailOtp(data.email, data.code, { consume: true });
  if (!otpResult.ok) return NextResponse.json({ error: otpResult.reason }, { status: otpResult.status });

  const email = data.email.trim().toLowerCase();
  const existingByEmail = await prisma.user.findUnique({ where: { email } });
  if (existingByEmail) return NextResponse.json({ error: "Bu email allaqachon ro'yxatdan o'tgan" }, { status: 409 });

  const passwordHash = await bcrypt.hash(data.password, 10);
  const role = data.role as UserRole;
  const locale = data.locale as Locale;
  let companyId = "";

  if (role === UserRole.OWNER) {
    const slugBase = slugify(data.companyName || "company");
    let slug = slugBase;
    let idx = 1;
    while (await prisma.company.findUnique({ where: { slug } })) {
      idx += 1;
      slug = `${slugBase}-${idx}`;
    }
    const company = await prisma.company.create({
      data: { name: data.companyName!, slug, defaultLocale: locale }
    });
    companyId = company.id;
  } else {
    const company = await prisma.company.findUnique({ where: { slug: data.companySlug! } });
    if (!company) return NextResponse.json({ error: "Kompaniya topilmadi (companySlug)" }, { status: 404 });
    companyId = company.id;
  }

  const user = await prisma.user.create({
    data: {
      companyId,
      name: data.name,
      email,
      phone: data.phone ? normalizePhone(data.phone) : null,
      passwordHash,
      role,
      locale
    }
  });

  if (role === UserRole.OUTLET) {
    const phone = normalizePhone(data.phone!);
    await prisma.outletProfile.create({
      data: {
        companyId,
        userId: user.id,
        outletName: data.outletName!,
        phone,
        address: data.address!,
        region: data.region!
      }
    });
  }

  return NextResponse.json({ ok: true, email });
}
