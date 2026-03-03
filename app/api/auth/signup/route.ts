import bcrypt from "bcrypt";
import { Locale, UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePhone, verifyOtp } from "@/lib/otp";
import { signupWithOtpSchema } from "@/lib/validations";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function POST(req: Request) {
  const parsed = signupWithOtpSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = parsed.data;
  const otpResult = await verifyOtp(data.phone, data.code, { consume: true });
  if (!otpResult.ok) return NextResponse.json({ error: otpResult.reason }, { status: otpResult.status });

  const phone = normalizePhone(data.phone);
  const existingByPhone = await prisma.user.findUnique({ where: { phone } });
  if (existingByPhone) return NextResponse.json({ error: "Bu telefon oldin ro'yxatdan o'tgan" }, { status: 409 });

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

  const digits = phone.replace(/[^\d]/g, "");
  const email = `${digits}-${role.toLowerCase()}@autogen.local`;
  const existsEmail = await prisma.user.findUnique({ where: { email } });
  if (existsEmail) return NextResponse.json({ error: "Ushbu telefon/rol allaqachon mavjud" }, { status: 409 });

  const user = await prisma.user.create({
    data: {
      companyId,
      name: data.name,
      email,
      phone,
      passwordHash,
      role,
      locale
    }
  });

  if (role === UserRole.OUTLET) {
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
