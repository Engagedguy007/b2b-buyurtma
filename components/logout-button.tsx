"use client";

import { signOut } from "next-auth/react";

export function LogoutButton({ label = "Chiqish" }: { label?: string }) {
  return (
    <button
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-100"
      onClick={() => signOut({ callbackUrl: "/login" })}
      type="button"
    >
      {label}
    </button>
  );
}
