import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";

export default async function ProfilePage() {
  const session = await getAuthSession();
  if (!session) redirect("/login");

  const role = session.user.role;
  const roleLabel = role === "OWNER" ? "Owner" : role === "COURIER" ? "Courier" : "Outlet";
  const homeLink = role === "OWNER" ? "/owner" : role === "COURIER" ? "/courier/orders" : "/outlet";

  return (
    <div className="card space-y-3">
      <h1 className="text-xl font-bold">Profil</h1>
      <p className="text-sm text-slate-600">Rol: {roleLabel}</p>
      <p className="text-sm text-slate-600">Ism: {session.user.name}</p>
      <p className="text-sm text-slate-600">Email: {session.user.email}</p>
      <Link href={homeLink} className="inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
        Ish paneliga qaytish
      </Link>
    </div>
  );
}
