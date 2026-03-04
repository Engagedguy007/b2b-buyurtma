import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createEmailOtp } from "@/lib/otp";
import { emailOtpRequestSchema } from "@/lib/validations";
import { sendEmail } from "@/services/email";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  const parsed = emailOtpRequestSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Email noto'g'ri" }, { status: 400 });

  const otp = await createEmailOtp(parsed.data.email);
  if (!otp.ok) return NextResponse.json({ error: otp.reason }, { status: otp.status });

  const text = `Tasdiqlash kodi: ${otp.code}. Kod 5 daqiqa amal qiladi.`;
  const emailRes = await sendEmail(otp.identifier, "Tasdiqlash kodi", text);
  if (!emailRes.ok) {
    await prisma.otpCode.deleteMany({ where: { id: otp.otpId } });
    return NextResponse.json({ error: `Email yuborilmadi: ${emailRes.error}` }, { status: emailRes.status });
  }

  if (process.env.NODE_ENV !== "production" && !process.env.RESEND_API_KEY) {
    console.log("OTP for", otp.identifier, ":", otp.code);
  }

  return NextResponse.json({ ok: true });
}
