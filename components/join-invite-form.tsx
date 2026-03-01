"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { getDictionary, type AppLocale } from "@/lib/i18n";

type InviteView = {
  outletName: string;
  phone: string;
  address: string;
  region: string | null;
  companyName: string;
  defaultLocale: AppLocale;
};

export function JoinInviteForm({ token }: { token: string }) {
  const [locale, setLocale] = useState<AppLocale>("UZ");
  const d = getDictionary(locale);
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [invite, setInvite] = useState<InviteView | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function verifyPin() {
    setError("");
    const res = await fetch(`/api/public/join/${token}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });

    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "PIN noto'g'ri");
      return;
    }

    setInvite(json.invite);
    setLocale(json.invite.defaultLocale);
    if (!name) setName(json.invite.outletName);
  }

  async function claimInvite() {
    setError("");
    setSaving(true);
    const res = await fetch(`/api/public/join/${token}/claim`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin, name, locale })
    });

    const json = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(json.error || "Xatolik");
      return;
    }

    const login = await signIn("credentials", {
      email: json.email,
      password: pin,
      remember: "true",
      redirect: false
    });

    if (login?.error) {
      setError("Auto login bo'lmadi, /login orqali kiring");
      return;
    }

    window.location.href = json.redirectTo || "/outlet";
  }

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="card space-y-2">
        <h1 className="text-xl font-bold">{d["join.title"]}</h1>
        <input placeholder={d["join.pin"]} value={pin} onChange={(e) => setPin(e.target.value)} />
        <button type="button" className="w-full rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white" onClick={verifyPin}>
          PIN tekshirish
        </button>
      </div>

      {invite ? (
        <div className="card space-y-2">
          <p className="text-sm text-slate-600">{invite.companyName}</p>
          <p className="text-sm">{invite.outletName} | {invite.phone}</p>
          <p className="text-sm">{invite.address}</p>
          <input placeholder={d["join.name"]} value={name} onChange={(e) => setName(e.target.value)} />
          <button
            type="button"
            className="w-full rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white"
            onClick={claimInvite}
            disabled={saving}
          >
            {d["join.continue"]}
          </button>
        </div>
      ) : null}

      {error ? <div className="card text-sm text-red-600">{error}</div> : null}
    </div>
  );
}
