/**
 * Locale rules shared by the client bundle and the Express server.
 *
 * The server needs these to stamp `lang`/`dir` on the served `index.html`
 * before React mounts; the client needs them to resolve the active locale.
 * Keeping one definition prevents the document from advertising a locale the
 * bundle cannot actually render.
 */

export const enabledLocales = ['en', 'ar'] as const;

export type EnabledLocale = (typeof enabledLocales)[number];

export type TextDirection = 'ltr' | 'rtl';

export const defaultLocale: EnabledLocale = 'en';

const rtlLocales = new Set<EnabledLocale>(['ar']);

const localeByLowercase = new Map<string, EnabledLocale>(
  enabledLocales.map((locale) => [locale.toLowerCase(), locale]),
);

/** Region-qualified tags that must resolve to an enabled locale. */
const localeAliases = new Map<string, EnabledLocale>([
  ['ar-eg', 'ar'],
  ['ar-sa', 'ar'],
  ['ar-ae', 'ar'],
  ['ar-ma', 'ar'],
  ['en-us', 'en'],
  ['en-gb', 'en'],
  ['en-au', 'en'],
  ['en-ca', 'en'],
]);

/** Resolves any requested tag to an enabled locale, falling back to English. */
export function normalizeAppLocale(locale?: string | null): EnabledLocale {
  if (!locale) {
    return defaultLocale;
  }

  /** Tolerates quoted or padded values from stale cookies and localStorage. */
  const normalized = locale
    .trim()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/_/g, '-')
    .toLowerCase();
  const exact = localeByLowercase.get(normalized);
  if (exact) {
    return exact;
  }

  const alias = localeAliases.get(normalized);
  if (alias) {
    return alias;
  }

  const base = normalized.split('-')[0];
  return localeByLowercase.get(base) ?? localeAliases.get(base) ?? defaultLocale;
}

export function getLocaleDirection(locale?: string | null): TextDirection {
  return rtlLocales.has(normalizeAppLocale(locale)) ? 'rtl' : 'ltr';
}
