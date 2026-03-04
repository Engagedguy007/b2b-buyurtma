import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";

const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_ATTEMPT_LIMIT = 5;
const OTP_REQUEST_WINDOW_MS = 60 * 1000;
const OTP_REQUEST_LIMIT = 3;

type OtpResult =
  | { ok: true; otpId: string; identifier: string; code: string }
  | { ok: false; status: 400 | 404 | 429 | 500; reason: string };

type VerifyResult =
  | { ok: true; otpId: string; identifier: string }
  | { ok: false; status: 400 | 404 | 429 | 500; reason: string };

export function normalizePhone(phone: string) {
  return phone.replace(/\s+/g, "");
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generateOtpCode() {
  return `${Math.floor(100000 + Math.random() * 900000)}`;
}

async function createOtpInternal(identifier: string): Promise<OtpResult> {
  try {
    const normalizedIdentifier = identifier;
    const windowStart = new Date(Date.now() - OTP_REQUEST_WINDOW_MS);

    const requestCount = await prisma.otpCode.count({
      where: {
        phone: normalizedIdentifier,
        createdAt: { gte: windowStart }
      }
    });
    if (requestCount >= OTP_REQUEST_LIMIT) {
      return { ok: false, status: 429, reason: "Juda ko'p urinish. 1 daqiqa kuting." };
    }

    // Same phone uchun eski aktiv kodlarni invalidate qilamiz.
    await prisma.otpCode.updateMany({
      where: { phone: normalizedIdentifier, usedAt: null },
      data: { usedAt: new Date() }
    });

    const code = generateOtpCode();
    const codeHash = await bcrypt.hash(code, 10);
    const otp = await prisma.otpCode.create({
      data: {
        phone: normalizedIdentifier,
        codeHash,
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
        attempts: 0
      }
    });

    return { ok: true, otpId: otp.id, identifier: normalizedIdentifier, code };
  } catch {
    return { ok: false, status: 500, reason: "OTP yaratishda server xatosi" };
  }
}

async function verifyOtpInternal(
  identifier: string,
  code: string,
  options?: { consume?: boolean }
): Promise<VerifyResult> {
  try {
    const normalizedIdentifier = identifier;
    const otp = await prisma.otpCode.findFirst({
      where: { phone: normalizedIdentifier, usedAt: null },
      orderBy: { createdAt: "desc" }
    });

    if (!otp) {
      return { ok: false, status: 404, reason: "OTP topilmadi" };
    }

    if (otp.expiresAt.getTime() < Date.now()) {
      await prisma.otpCode.delete({ where: { id: otp.id } });
      return { ok: false, status: 400, reason: "OTP muddati tugagan" };
    }

    if (otp.attempts >= OTP_ATTEMPT_LIMIT) {
      await prisma.otpCode.delete({ where: { id: otp.id } });
      return { ok: false, status: 429, reason: "OTP urinish limiti tugagan" };
    }

    const matched = await bcrypt.compare(code, otp.codeHash);
    if (!matched) {
      const updated = await prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } }
      });

      if (updated.attempts >= OTP_ATTEMPT_LIMIT) {
        await prisma.otpCode.delete({ where: { id: otp.id } });
        return { ok: false, status: 429, reason: "OTP urinish limiti tugagan" };
      }

      return { ok: false, status: 400, reason: "OTP noto'g'ri" };
    }

    if (options?.consume) {
      await prisma.otpCode.delete({ where: { id: otp.id } });
    }

    return { ok: true, otpId: otp.id, identifier: normalizedIdentifier };
  } catch {
    return { ok: false, status: 500, reason: "OTP tekshirishda server xatosi" };
  }
}

export async function createOtp(phone: string): Promise<OtpResult> {
  return createOtpInternal(normalizePhone(phone));
}

export async function verifyOtp(phone: string, code: string, options?: { consume?: boolean }): Promise<VerifyResult> {
  return verifyOtpInternal(normalizePhone(phone), code, options);
}

export async function createEmailOtp(email: string): Promise<OtpResult> {
  return createOtpInternal(normalizeEmail(email));
}

export async function verifyEmailOtp(email: string, code: string, options?: { consume?: boolean }): Promise<VerifyResult> {
  return verifyOtpInternal(normalizeEmail(email), code, options);
}
