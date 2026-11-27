/**
 * Minimal typed localization. No runtime library is needed for one locale;
 * the Messages type forces every future locale to provide every key.
 * To add a language: create src/content/localization/<code>.ts typed as
 * Messages, register it in `catalogs`, and add the code to SupportedLocale.
 */
import { tr } from './tr';

type DeepString<T> = { [K in keyof T]: T[K] extends string ? string : DeepString<T[K]> };
export type Messages = DeepString<typeof tr>;

export type SupportedLocale = 'tr';
const catalogs: Record<SupportedLocale, Messages> = { tr };

type Paths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${Prefix}${K}` : Paths<T[K], `${Prefix}${K}.`>;
}[keyof T & string];

export type MessageKey = Paths<Messages>;
export type MessageParams = Record<string, string | number>;

let activeLocale: SupportedLocale = 'tr';

export function setLocale(locale: SupportedLocale) {
  activeLocale = locale;
}

export function getLocale(): SupportedLocale {
  return activeLocale;
}

/** BCP-47 tag used for Intl number/date formatting. */
export function intlLocale(): string {
  return { tr: 'tr-TR' }[activeLocale];
}

export function t(key: MessageKey, params?: MessageParams): string {
  const value = key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], catalogs[activeLocale]);
  if (typeof value !== 'string') {
    if (__DEV__) console.warn(`[i18n] Missing key: ${key}`);
    return key;
  }
  if (!params) return value;
  return value.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}
