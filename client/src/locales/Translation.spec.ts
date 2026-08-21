import type { TranslationResource } from './i18n';
import {
  __resetLocaleForTests,
  __setLocaleLoaderForTests,
  changeLanguageSafely,
  ensureLocale,
  initializeI18n,
  normalizeLocale,
} from './i18n';
import English from './en/translation.json';
import Arabic from './ar/translation.json';
import { TranslationKeys } from '~/hooks';
import i18n from './i18n';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

describe('i18next translation tests', () => {
  // Ensure i18next is initialized before any tests run
  beforeAll(async () => {
    await initializeI18n();
  });

  afterEach(async () => {
    await changeLanguageSafely('en');
  });

  it('should return the correct translation for a valid key in English', async () => {
    await changeLanguageSafely('en');
    expect(i18n.t('com_ui_examples')).toBe(English.com_ui_examples);
  });

  it('should return the correct translation for a valid key in Arabic', async () => {
    await changeLanguageSafely('ar');
    expect(i18n.t('com_ui_examples')).toBe(Arabic.com_ui_examples);
  });

  it('should fallback to English for an invalid language code', async () => {
    // When an invalid language is provided, i18next should fallback to English
    await changeLanguageSafely('invalid-code');
    expect(i18n.t('com_ui_examples')).toBe(English.com_ui_examples);
  });

  it('should fallback to English for locales this deployment does not enable', async () => {
    await changeLanguageSafely('fr-FR');
    expect(i18n.language).toBe('en');
    expect(i18n.t('com_ui_examples')).toBe(English.com_ui_examples);
  });

  it('should return the key itself for an invalid key', async () => {
    await changeLanguageSafely('en');
    expect(i18n.t('invalid-key' as TranslationKeys)).toBe('invalid-key'); // Returns the key itself
  });

  it('should correctly format placeholders in the translation', async () => {
    await changeLanguageSafely('en');
    expect(i18n.t('com_endpoint_default_with_num', { 0: 'John' })).toBe('default: John');
  });

  it('should normalize language selector values to locale files', () => {
    expect(normalizeLocale('en-US')).toBe('en');
    expect(normalizeLocale('en-GB')).toBe('en');
    expect(normalizeLocale('ar-EG')).toBe('ar');
    expect(normalizeLocale('ar-SA')).toBe('ar');
    expect(normalizeLocale('ar')).toBe('ar');
  });

  it('should normalize disabled locales to English', () => {
    expect(normalizeLocale('de-DE')).toBe('en');
    expect(normalizeLocale('fr-FR')).toBe('en');
    expect(normalizeLocale('zh-Hans')).toBe('en');
    expect(normalizeLocale('pt-BR')).toBe('en');
    expect(normalizeLocale(null)).toBe('en');
  });

  it('should apply RTL direction for Arabic and LTR for English', async () => {
    await changeLanguageSafely('ar-EG');
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');

    await changeLanguageSafely('en-US');
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('should reuse an in-flight locale load', async () => {
    __resetLocaleForTests('ar');
    const pendingLocale = deferred<{ default: TranslationResource }>();
    const loadLocale = jest.fn(() => pendingLocale.promise);
    const restoreLoader = __setLocaleLoaderForTests('ar', loadLocale);

    const firstLoad = ensureLocale('ar-EG');
    const secondLoad = ensureLocale('ar-EG');

    expect(loadLocale).toHaveBeenCalledTimes(1);

    pendingLocale.resolve({ default: { com_ui_examples: 'أمثلة' } });

    await expect(Promise.all([firstLoad, secondLoad])).resolves.toEqual(['ar', 'ar']);
    expect(i18n.getResource('ar', 'translation', 'com_ui_examples')).toBe('أمثلة');

    restoreLoader();
    __resetLocaleForTests('ar');
  });

  it('should retry a locale load after a transient failure', async () => {
    __resetLocaleForTests('ar');
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let callCount = 0;
    const restoreLoader = __setLocaleLoaderForTests('ar', async () => {
      callCount += 1;
      if (callCount === 1) {
        throw new Error('temporary chunk failure');
      }

      return { default: { com_ui_examples: 'أمثلة' } };
    });

    await expect(ensureLocale('ar-EG')).resolves.toBe('en');
    await expect(ensureLocale('ar-EG')).resolves.toBe('ar');

    expect(callCount).toBe(2);
    expect(i18n.getResource('ar', 'translation', 'com_ui_examples')).toBe('أمثلة');

    restoreLoader();
    __resetLocaleForTests('ar');
    consoleErrorSpy.mockRestore();
  });

  it('should only apply the newest rapid language switch', async () => {
    __resetLocaleForTests('ar');

    const arLocale = deferred<{ default: TranslationResource }>();
    const restoreAr = __setLocaleLoaderForTests('ar', () => arLocale.promise);

    const firstSwitch = changeLanguageSafely('ar-EG');
    const latestSwitch = changeLanguageSafely('en-US');

    await expect(latestSwitch).resolves.toBe('en');
    expect(i18n.language).toBe('en');

    arLocale.resolve({ default: { com_ui_examples: 'أمثلة' } });
    await firstSwitch;

    expect(i18n.language).toBe('en');
    expect(document.documentElement.lang).toBe('en');

    restoreAr();
    __resetLocaleForTests('ar');
  });
});
