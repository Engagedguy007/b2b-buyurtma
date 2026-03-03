import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_ATTEMPT_LIMIT = 5;

export function normalizePhone(phone: string) {
  const stripped = phone.replace(/\s+/g, "");
  return stripped.startsWith("+") ? stripped : `+${stripped}`;
}

export function generateOtpCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

export async function createOtp(phone: string) {
  const normalizedPhone = normalizePhone(phone);
  const code = generateOtpCode();
  const codeHash = await bcrypt.hash(code, 10);

  await prisma.otpCode.create({
    data: {
      phone: normalizedPhone,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
      attempts: 0
    }
  });

  return { normalizedPhone, code };
}

export async function verifyOtp(phone: string, code: string) {
  const normalizedPhone = normalizePhone(phone);
  const otp = await prisma.otpCode.findFirst({
    where: { phone: normalizedPhone, usedAt: null },
    orderBy: { createdAt: "desc" }
  });

  if (!otp) {
    return { ok: false as const, reason: "OTP topilmadi" };
  }
  if (otp.expiresAt.getTime() < Date.now()) {
    return { ok: false as const, reason: "OTP muddati tugagan" };
  }
  if (otp.attempts >= OTP_ATTEMPT_LIMIT) {
    return { ok: false as const, reason: "Urinishlar limiti tugagan" };
  }

  const matched = await bcrypt.compare(code, otp.codeHash);
  if (!matched) {
    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } }
    });
    return { ok: false as const, reason: "OTP noto'g'ri" };
  }

  return { ok: true as const, otpId: otp.id, phone: normalizedPhone };
}

export async function consumeOtp(otpId: string) {
  await prisma.otpCode.update({ where: { id: otpId }, data: { usedAt: new Date() } });
}
