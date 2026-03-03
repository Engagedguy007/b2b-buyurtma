"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

type Step = 1 | 2 | 3;
type Role = "OWNER" | "COURIER" | "OUTLET";

export function SignupForm() {
  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState("+998");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("OUTLET");
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("samarqand-foods");
  const [outletName, setOutletName] = useState("");
  const [address, setAddress] = useState("");
  const [region, setRegion] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function requestOtp() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/auth/otp/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone })
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || "SMS yuborilmadi");
        return;
      }
      setMsg("OTP yuborildi");
      setStep(2);
    } catch {
      setMsg("Tarmoq xatosi. Internetni tekshiring.");
    } finally {
      setSaving(false);
    }
  }

  async function verifyOtp() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code })
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || "OTP noto'g'ri yoki muddati tugagan");
        return;
      }
      setStep(3);
    } catch {
      setMsg("Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      setSaving(false);
    }
  }

  async function completeSignup() {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          code,
          name,
          password,
          role,
          companyName: role === "OWNER" ? companyName : undefined,
          companySlug: role !== "OWNER" ? companySlug : undefined,
          locale: "UZ",
          outletName: role === "OUTLET" ? outletName : undefined,
          address: role === "OUTLET" ? address : undefined,
          region: role === "OUTLET" ? region : undefined
        })
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg(json.error || "Ro'yxatdan o'tishda xato");
        return;
      }

      const signInRes = await signIn("credentials", {
        email: json.email,
        password,
        remember: "true",
        redirect: false
      });

      if (signInRes?.error) {
        setMsg("Account yaratildi, lekin auto login bo'lmadi");
        return;
      }

      window.location.href = role === "OWNER" ? "/owner" : role === "COURIER" ? "/courier/orders" : "/outlet";
    } catch {
      setMsg("Tarmoq xatosi. Qayta urinib ko'ring.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card space-y-3">
      <h1 className="text-xl font-bold">Ro'yxatdan o'tish (OTP)</h1>

      {step === 1 ? (
        <>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+998901234567" />
          <button type="button" onClick={requestOtp} disabled={saving} className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
            {saving ? "Yuborilmoqda..." : "OTP yuborish"}
          </button>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="6 xonali kod" />
          <button type="button" onClick={verifyOtp} disabled={saving} className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
            {saving ? "Tekshirilmoqda..." : "OTP tasdiqlash"}
          </button>
        </>
      ) : null}

      {step === 3 ? (
        <div className="space-y-2">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ism" />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Parol" />
          <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="OUTLET">OUTLET</option>
            <option value="COURIER">COURIER</option>
            <option value="OWNER">OWNER</option>
          </select>

          {role === "OWNER" ? (
            <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Kompaniya nomi" />
          ) : (
            <input value={companySlug} onChange={(e) => setCompanySlug(e.target.value)} placeholder="Kompaniya slug (masalan samarqand-foods)" />
          )}

          {role === "OUTLET" ? (
            <>
              <input value={outletName} onChange={(e) => setOutletName(e.target.value)} placeholder="Outlet nomi" />
              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Manzil" />
              <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Hudud" />
            </>
          ) : null}

          <button type="button" onClick={completeSignup} disabled={saving} className="w-full rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
            {saving ? "Yaratilmoqda..." : "Account yaratish"}
          </button>
        </div>
      ) : null}

      {msg ? <p className="text-sm text-slate-600">{msg}</p> : null}
    </div>
  );
}
