import {
  defaultLocale,
  enabledLocales,
  getLocaleDirection,
  normalizeAppLocale,
} from './locales';

describe('locales', () => {
  it('exposes exactly the locales this deployment ships', () => {
    expect([...enabledLocales]).toEqual(['en', 'ar']);
    expect(defaultLocale).toBe('en');
  });

  describe('normalizeAppLocale', () => {
    it('resolves enabled locales and their regional variants', () => {
      expect(normalizeAppLocale('en')).toBe('en');
      expect(normalizeAppLocale('en-US')).toBe('en');
      expect(normalizeAppLocale('en-GB')).toBe('en');
      expect(normalizeAppLocale('ar')).toBe('ar');
      expect(normalizeAppLocale('ar-EG')).toBe('ar');
      expect(normalizeAppLocale('ar-SA')).toBe('ar');
    });

    it('falls back to English for locales that are not enabled', () => {
      expect(normalizeAppLocale('de-DE')).toBe('en');
      expect(normalizeAppLocale('fr')).toBe('en');
      expect(normalizeAppLocale('zh-Hans')).toBe('en');
      expect(normalizeAppLocale('not-a-locale')).toBe('en');
    });

    it('falls back to English for empty input', () => {
      expect(normalizeAppLocale(undefined)).toBe('en');
      expect(normalizeAppLocale(null)).toBe('en');
      expect(normalizeAppLocale('')).toBe('en');
    });

    it('tolerates quoted, padded and underscored values', () => {
      expect(normalizeAppLocale('"ar-EG"')).toBe('ar');
      expect(normalizeAppLocale("'ar'")).toBe('ar');
      expect(normalizeAppLocale('  ar-EG  ')).toBe('ar');
      expect(normalizeAppLocale('ar_EG')).toBe('ar');
    });

    it('resolves an unknown region of an enabled base language', () => {
      expect(normalizeAppLocale('ar-XX')).toBe('ar');
      expect(normalizeAppLocale('en-XX')).toBe('en');
    });
  });

  describe('getLocaleDirection', () => {
    it('returns rtl only for Arabic', () => {
      expect(getLocaleDirection('ar')).toBe('rtl');
      expect(getLocaleDirection('ar-EG')).toBe('rtl');
      expect(getLocaleDirection('"ar-EG"')).toBe('rtl');
    });

    it('returns ltr for English and for disabled locales', () => {
      expect(getLocaleDirection('en')).toBe('ltr');
      expect(getLocaleDirection('en-US')).toBe('ltr');
      expect(getLocaleDirection('de-DE')).toBe('ltr');
      expect(getLocaleDirection(undefined)).toBe('ltr');
    });

    it('does not report rtl for a disabled rtl language the bundle cannot render', () => {
      expect(getLocaleDirection('he-IL')).toBe('ltr');
      expect(getLocaleDirection('fa-IR')).toBe('ltr');
    });
  });
});
