import { NextResponse } from "next/server";
import { otpRequestSchema } from "@/lib/validations";
import { createOtp } from "@/lib/otp";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/services/sms";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  const parsed = otpRequestSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Telefon formati noto'g'ri. +998XXXXXXXXX kiriting." }, { status: 400 });
  }

  const otp = await createOtp(parsed.data.phone);
  if (!otp.ok) {
    return NextResponse.json({ error: otp.reason }, { status: otp.status });
  }

  const smsText = `Tasdiqlash kodi: ${otp.code}. Kod 5 daqiqa amal qiladi.`;
  const smsRes = await sendSms(otp.phone, smsText);
  if (!smsRes.ok) {
    await prisma.otpCode.deleteMany({ where: { id: otp.otpId } });
    return NextResponse.json({ error: `SMS yuborilmadi: ${smsRes.error}` }, { status: smsRes.status || 500 });
  }

  if (process.env.NODE_ENV !== "production" && !process.env.SMS_PROVIDER) {
    console.log("OTP for", otp.phone, ":", otp.code);
  }

  return NextResponse.json({ ok: true });
}
