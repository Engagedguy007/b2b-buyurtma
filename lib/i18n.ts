import type { Locale } from "@prisma/client";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import uz from "@/messages/uz.json";

export const LOCALES = ["UZ", "RU", "EN"] as const;
export type AppLocale = (typeof LOCALES)[number];

type Dictionary = Record<string, string>;

const dictionaries: Record<AppLocale, Dictionary> = {
  UZ: uz,
  RU: ru,
  EN: en
};

export function normalizeLocale(locale?: string | null): AppLocale {
  if (!locale) return "UZ";
  const upper = locale.toUpperCase();
  return (LOCALES as readonly string[]).includes(upper) ? (upper as AppLocale) : "UZ";
}

export function getDictionary(locale?: string | Locale | null) {
  return dictionaries[normalizeLocale(locale)];
}

export function t(locale: string | undefined | null, key: string) {
  const dictionary = getDictionary(locale);
  return dictionary[key] || key;
}
