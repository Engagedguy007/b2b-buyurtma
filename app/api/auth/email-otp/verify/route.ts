import { NextResponse } from "next/server";
import { verifyEmailOtp } from "@/lib/otp";
import { emailOtpVerifySchema } from "@/lib/validations";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  const parsed = emailOtpVerifySchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Email yoki OTP format noto'g'ri" }, { status: 400 });

  const result = await verifyEmailOtp(parsed.data.email, parsed.data.code);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: result.status });

  return NextResponse.json({ ok: true });
}
