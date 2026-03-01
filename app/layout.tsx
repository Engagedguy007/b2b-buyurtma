import type { Metadata } from "next";
import { ReactNode } from "react";
import "./globals.css";
import Providers from "@/app/providers";
import { AppHeader } from "@/components/app-header";

export const metadata: Metadata = {
  title: "B2B Zavod Buyurtma",
  description: "Zavod va shahobchalar uchun tez buyurtma tizimi"
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uz">
      <body>
        <Providers>
          <AppHeader />
          <main className="mx-auto w-full max-w-6xl px-4 py-5">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
