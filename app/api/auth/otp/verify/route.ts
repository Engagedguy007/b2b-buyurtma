import { NextResponse } from "next/server";
import { otpVerifySchema } from "@/lib/validations";
import { verifyOtp } from "@/lib/otp";

export async function POST(req: Request) {
  const payload = await req.json().catch(() => null);
  const parsed = otpVerifySchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Telefon yoki OTP format noto'g'ri" }, { status: 400 });

  const result = await verifyOtp(parsed.data.phone, parsed.data.code);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: result.status });

  return NextResponse.json({ ok: true });
}
