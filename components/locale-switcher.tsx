"use client";

import { useEffect, useState } from "react";
import { LOCALES, type AppLocale } from "@/lib/i18n";

type Props = {
  initialLocale: AppLocale;
};

export function LocaleSwitcher({ initialLocale }: Props) {
  const [locale, setLocale] = useState<AppLocale>(initialLocale);

  useEffect(() => {
    const saved = localStorage.getItem("locale") as AppLocale | null;
    if (saved && LOCALES.includes(saved)) {
      setLocale(saved);
    }
  }, []);

  async function updateLocale(next: AppLocale) {
    setLocale(next);
    localStorage.setItem("locale", next);
    document.cookie = `locale=${next}; path=/; max-age=${60 * 24 * 60 * 60}`;

    try {
      await fetch("/api/preferences/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next })
      });
    } catch {
      // no-op for public pages
    }

    window.location.reload();
  }

  return (
    <div className="flex items-center gap-1 rounded-md border border-slate-200 p-1">
      {LOCALES.map((item) => (
        <button
          key={item}
          type="button"
          className={`rounded px-2 py-1 text-xs font-semibold ${locale === item ? "bg-slate-900 text-white" : "text-slate-700"}`}
          onClick={() => updateLocale(item)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}
