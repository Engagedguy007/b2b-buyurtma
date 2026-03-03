"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

const redirects = {
  OUTLET: "/outlet",
  OWNER: "/owner",
  COURIER: "/courier/orders"
} as const;

export function LoginForm() {
  const [email, setEmail] = useState("outlet@demo.uz");
  const [password, setPassword] = useState("Outlet123!");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    const res = await signIn("credentials", {
      email,
      password,
      remember: remember ? "true" : "false",
      redirect: false
    });

    if (res?.error) {
      setError("Login yoki parol noto'g'ri");
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role as keyof typeof redirects | undefined;

    window.location.href = (role && redirects[role]) || "/";
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-3">
      <h1 className="text-xl font-bold">Tizimga kirish</h1>
      <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email yoki telefon" />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Parol" />
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        Eslab qolish
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <button className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-semibold text-white" type="submit">
        Kirish
      </button>
    </form>
  );
}
