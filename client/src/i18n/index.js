/**
 * i18n bootstrap (i18next + react-i18next).
 * Locales imported directly from JSON to keep the bundle simple.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import vi from './locales/vi.json';

const STORAGE_KEY = 'cms_language';
const stored = (typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      vi: { translation: vi },
    },
    lng: stored,
    fallbackLng: 'en',
    interpolation: { escapeValue: false }, // React already escapes
  });

export function setLanguage(lang) {
  i18n.changeLanguage(lang);
  if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, lang);
  if (typeof document !== 'undefined') {
    document.title = `${i18n.t('dashboard')} - Post Management`;
  }
}

export default i18n;