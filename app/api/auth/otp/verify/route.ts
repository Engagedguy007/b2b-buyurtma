import { NextResponse } from "next/server";
import { otpVerifySchema } from "@/lib/validations";
import { verifyOtp } from "@/lib/otp";

export async function POST(req: Request) {
  const parsed = otpVerifySchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const result = await verifyOtp(parsed.data.phone, parsed.data.code);
  if (!result.ok) return NextResponse.json({ error: result.reason }, { status: 400 });

  return NextResponse.json({ ok: true });
}
