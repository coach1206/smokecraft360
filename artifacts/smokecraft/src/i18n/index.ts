/**
 * i18n bootstrap for the SmokeCraft / P.I. kiosk frontend.
 *
 * Detection order (first match wins):
 *   1. localStorage["pi_language"]       — user's explicit prior choice
 *   2. <html lang="…">                   — operator-set kiosk default
 *   3. navigator.language                — browser/OS preference
 *   4. fallback "en"
 *
 * Adding a new language: drop a new JSON file in ./locales/, add it to the
 * `resources` map below and to SUPPORTED_LANGUAGES. No other code changes.
 */
import i18n              from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector  from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English",  flag: "🇺🇸" },
  { code: "es", label: "Español",  flag: "🇪🇸" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const LANGUAGE_STORAGE_KEY = "pi_language";

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
    },
    fallbackLng:    "en",
    supportedLngs:  SUPPORTED_LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true, // accept "es-MX" → "es"
    load:           "languageOnly",
    interpolation:  { escapeValue: false }, // React already escapes
    detection: {
      order:        ["localStorage", "htmlTag", "navigator"],
      caches:       ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    returnNull: false,
  });

export default i18n;
