type SendEmailResult = { ok: true } | { ok: false; status: number; error: string };

export async function sendEmail(to: string, subject: string, text: string): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[DEV EMAIL OTP] to=${to} subject=${subject} text=${text}`);
      return { ok: true };
    }
    return { ok: false, status: 500, error: "Email provider sozlanmagan" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        text
      })
    });

    if (!res.ok) {
      return { ok: false, status: res.status, error: "Email yuborishda xato" };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, status: 500, error: (error as Error).message };
  }
}
