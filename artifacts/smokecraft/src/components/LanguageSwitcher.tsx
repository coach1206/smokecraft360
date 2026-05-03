/**
 * LanguageSwitcher — compact dropdown that flips i18next's active language
 * and persists the choice. Persistence is automatic via the LanguageDetector
 * cache config in src/i18n/index.ts (writes to localStorage["pi_language"]).
 *
 * Pure client widget — no new network or context dependencies, safe to drop
 * into any header, footer, settings panel, or kiosk overlay.
 */
import { useTranslation } from "react-i18next";
import { Globe }          from "lucide-react";
import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/i18n";

interface Props {
  /** Visual variant. `compact` = icon + 2-letter code (kiosk overlays);
   *  `full` = icon + flag + label (settings/header rows). */
  variant?: "compact" | "full";
  /** Override the rendered className (still merged with sane defaults). */
  className?: string;
}

export function LanguageSwitcher({ variant = "compact", className = "" }: Props) {
  const { i18n, t } = useTranslation();
  const current = (i18n.resolvedLanguage ?? i18n.language ?? "en").slice(0, 2) as LanguageCode;

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    void i18n.changeLanguage(e.target.value);
  };

  return (
    <label
      data-testid="language-switcher"
      aria-label={t("language.label", "Language")}
      className={`inline-flex items-center gap-2 rounded-md border border-white/15 bg-black/40 px-2 py-1 text-xs text-white/80 hover:bg-black/55 ${className}`}
    >
      <Globe size={14} aria-hidden />
      <select
        value={current}
        onChange={onChange}
        className="appearance-none bg-transparent pr-1 text-xs uppercase tracking-wider focus:outline-none"
      >
        {SUPPORTED_LANGUAGES.map((lang) => (
          <option key={lang.code} value={lang.code} className="bg-black text-white">
            {variant === "full" ? `${lang.flag}  ${lang.label}` : lang.code.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  );
}

export default LanguageSwitcher;
