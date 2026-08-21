import { atom } from 'recoil';
import Cookies from 'js-cookie';
import { normalizeLocale } from '~/locales/i18n';
import { atomWithLocalStorage } from './utils';

const readStoredLang = () => {
  if (typeof localStorage === 'undefined') {
    return undefined;
  }

  const storedLang = localStorage.getItem('lang');
  if (!storedLang) {
    return undefined;
  }

  try {
    const parsedLang = JSON.parse(storedLang);
    return typeof parsedLang === 'string' ? parsedLang : storedLang;
  } catch {
    return storedLang;
  }
};

/** Selector values for the locales this deployment enables. */
const selectorValueByLocale = {
  en: 'en-US',
  ar: 'ar-EG',
} as const;

const defaultLang = () => {
  const userLang =
    (typeof navigator !== 'undefined' ? navigator.language || navigator.languages?.[0] : null) ??
    'en';
  const requested = Cookies.get('lang') || readStoredLang() || userLang;
  return selectorValueByLocale[normalizeLocale(requested)];
};

const lang = atomWithLocalStorage('lang', defaultLang());
const languageLoading = atom<boolean>({
  key: 'languageLoading',
  default: false,
});

export default { lang, languageLoading };
