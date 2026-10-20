import { useCallback, useEffect } from 'react';
import { useI18nStore, dirFor, type Lang } from '@/stores/i18n.store';
import { translations, type TranslationKey } from './translations';

type Interpolation = Record<string, string | number>;

export function useTranslation() {
  const lang = useI18nStore((s) => s.lang);
  const setLang = useI18nStore((s) => s.setLang);
  const toggleLang = useI18nStore((s) => s.toggleLang);
  const dir = dirFor(lang);

  const t = useCallback(
    (key: TranslationKey, vars?: Interpolation) => {
      const entry = translations[key];
      let value = entry ? entry[lang] : (key as string);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return value;
    },
    [lang],
  );

  /** Inline text in both languages: tr('Add money', 'أضف مالًا'). */
  const tr = useCallback((en: string, ar: string) => (lang === 'ar' ? ar : en), [lang]);

  /** Show the Arabic name in Arabic when there is one. */
  const nameOf = useCallback(
    (item: { name: string; arabic?: string } | undefined | null) =>
      !item ? '' : lang === 'ar' && item.arabic ? item.arabic : item.name,
    [lang],
  );

  return { t, tr, nameOf, lang, dir, setLang, toggleLang };
}

/**
 * Mounts at the app root and keeps the <html> element's `lang` and `dir`
 * attributes in sync with the i18n store. Drop one of these in once and
 * every Tailwind `rtl:` variant starts working automatically.
 */
export function I18nDocumentSync(): null {
  const lang = useI18nStore((s) => s.lang);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dirFor(lang);
  }, [lang]);
  return null;
}

export const LANGUAGES: { code: Lang; label: string; short: string }[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'ar', label: 'العربية', short: 'ع' },
];
