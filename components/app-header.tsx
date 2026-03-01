import Link from "next/link";
import { cookies } from "next/headers";
import { getAuthSession } from "@/lib/auth";
import { normalizeLocale, t } from "@/lib/i18n";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { LogoutButton } from "@/components/logout-button";

export async function AppHeader() {
  const session = await getAuthSession();
  const role = session?.user?.role;
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;
  const locale = normalizeLocale(session?.user?.locale || cookieLocale || "UZ");

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="font-bold text-slate-900">
          B2B Buyurtma Tizimi
        </Link>
        <div className="flex items-center gap-2">
          {role === "OUTLET" && (
            <>
              <Link href="/outlet" className="text-sm text-slate-700">
                {t(locale, "header.quickOrder")}
              </Link>
              <Link href="/outlet/orders" className="text-sm text-slate-700">
                {t(locale, "header.orders")}
              </Link>
            </>
          )}
          {role === "MANAGER" && (
            <Link href="/manager" className="text-sm text-slate-700">
              {t(locale, "header.manager")}
            </Link>
          )}
          {role === "COURIER" && (
            <Link href="/courier/orders" className="text-sm text-slate-700">
              {t(locale, "header.courier")}
            </Link>
          )}
          <LocaleSwitcher initialLocale={locale} />
          {session?.user ? (
            <LogoutButton label={t(locale, "common.logout")} />
          ) : (
            <Link href="/login" className="text-sm">
              {t(locale, "common.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
