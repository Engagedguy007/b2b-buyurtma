"use client";

import { NextIntlClientProvider } from "next-intl";
import { SessionProvider } from "next-auth/react";
import { ReactNode } from "react";

export default function Providers({
  children,
  locale,
  messages
}: {
  children: ReactNode;
  locale: string;
  messages: Record<string, string>;
}) {
  return (
    <SessionProvider>
      <NextIntlClientProvider locale={locale.toLowerCase()} messages={messages}>
        {children}
      </NextIntlClientProvider>
    </SessionProvider>
  );
}
