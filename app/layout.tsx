import type { Metadata } from "next";
import { ReactNode } from "react";
import { cookies } from "next/headers";
import "./globals.css";
import Providers from "@/app/providers";
import { AppHeader } from "@/components/app-header";
import { getAuthSession } from "@/lib/auth";
import { getDictionary, normalizeLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "B2B Zavod Buyurtma",
  description: "Zavod va shahobchalar uchun tez buyurtma tizimi"
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const session = await getAuthSession();
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get("locale")?.value;
  const locale = normalizeLocale(session?.user?.locale || cookieLocale || "UZ");
  const messages = getDictionary(locale);

  return (
    <html lang={locale.toLowerCase()}>
      <body>
        <Providers locale={locale} messages={messages}>
          <AppHeader />
          <main className="mx-auto w-full max-w-6xl px-4 py-5">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
