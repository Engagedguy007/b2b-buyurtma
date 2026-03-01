import Link from "next/link";
import { getAuthSession } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";

export async function AppHeader() {
  const session = await getAuthSession();
  const role = session?.user?.role;

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-bold text-slate-900">
          B2B Buyurtma Tizimi
        </Link>
        <div className="flex items-center gap-3">
          {role === "OUTLET" && <Link href="/outlet" className="text-sm text-slate-700">Tez zakas</Link>}
          {role === "MANAGER" && <Link href="/manager" className="text-sm text-slate-700">Manager</Link>}
          {role === "COURIER" && <Link href="/courier" className="text-sm text-slate-700">Kurer</Link>}
          {session?.user ? <LogoutButton /> : <Link href="/login" className="text-sm">Kirish</Link>}
        </div>
      </div>
    </header>
  );
}
