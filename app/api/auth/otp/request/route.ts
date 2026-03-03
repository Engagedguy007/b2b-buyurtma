import { NextResponse } from "next/server";
import { otpRequestSchema } from "@/lib/validations";
import { createOtp } from "@/lib/otp";

export async function POST(req: Request) {
  const parsed = otpRequestSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { normalizedPhone, code } = await createOtp(parsed.data.phone);

  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV OTP] ${normalizedPhone}: ${code}`);
  }

  return NextResponse.json({ ok: true });
}
