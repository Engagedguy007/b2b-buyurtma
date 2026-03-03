type SendSmsResult = { ok: true } | { ok: false; status: number; error: string };

let eskizTokenCache: { token: string; expiresAt: number } | null = null;

async function getEskizToken() {
  if (eskizTokenCache && eskizTokenCache.expiresAt > Date.now()) {
    return eskizTokenCache.token;
  }

  const email = process.env.ESKIZ_EMAIL;
  const password = process.env.ESKIZ_PASSWORD;
  if (!email || !password) {
    throw new Error("ESKIZ credentials missing");
  }

  const res = await fetch("https://notify.eskiz.uz/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    throw new Error(`Eskiz auth failed: ${res.status}`);
  }

  const json = (await res.json()) as { data?: { token?: string } };
  const token = json?.data?.token;
  if (!token) throw new Error("Eskiz token missing");

  eskizTokenCache = { token, expiresAt: Date.now() + 50 * 60 * 1000 };
  return token;
}

async function sendViaEskiz(phone: string, message: string): Promise<SendSmsResult> {
  try {
    const token = await getEskizToken();
    const from = process.env.ESKIZ_FROM || "4546";

    const body = new URLSearchParams();
    body.set("mobile_phone", phone.replace(/^\+/, ""));
    body.set("message", message);
    body.set("from", from);

    const res = await fetch("https://notify.eskiz.uz/api/message/sms/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body
    });

    if (!res.ok) {
      return { ok: false, status: res.status, error: "Eskiz SMS yuborishda xato" };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, status: 500, error: (error as Error).message };
  }
}

export async function sendSms(phone: string, message: string): Promise<SendSmsResult> {
  const provider = process.env.SMS_PROVIDER?.toLowerCase();

  if (provider === "eskiz") {
    return sendViaEskiz(phone, message);
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(message);
    return { ok: true };
  }

  return { ok: false, status: 500, error: "SMS provider sozlanmagan" };
}
