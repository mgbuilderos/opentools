import { LOCALES } from '@/lib/i18n/locales';

/*
  The link cluster that lets a reader change edition without losing the page.

  Plain anchors rather than a dropdown, for two reasons: a crawler follows an
  `<a href>` and does not operate a select, and `hrefLang` on each link states
  the target's language -- the same fact the `alternates.languages` cluster
  states in the head. Changing language needs no JavaScript.

  `<a>` rather than `next/link`, like `CategoryHubPage`: a full navigation is
  the right behaviour when the whole document changes language, and it keeps
  this component importable by the metadata sweeps, which alias only the few
  `next/*` modules the page files already needed.

  It takes the locale *code* rather than a `Locale` object because it is
  rendered from `AppShell`, a client component, and a code is the smallest
  thing that can cross that boundary.
*/

export function LanguageSwitcher({
  currentCode,
  route,
  label,
  englishLabel,
}: {
  /** The locale being read. Excluded from the list. */
  currentCode: string;
  /** The English route, e.g. `/pdf/merge`. `''` for a locale hub. */
  route: string;
  /** "Idioma", "Langue", ... in the locale being read. */
  label: string;
  /** What this locale calls the English edition. */
  englishLabel: string;
}) {
  const others = LOCALES.filter((locale) => locale.code !== currentCode);
  return (
    <nav aria-label={label} className="border-t border-border pt-6">
      <p className="mb-3 text-sm font-medium text-muted-foreground">{label}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        <li>
          <a
            className="focus-ring text-sm underline underline-offset-4"
            href={route || '/'}
            hrefLang="en"
          >
            {englishLabel}
          </a>
        </li>
        {others.map((locale) => (
          <li key={locale.code}>
            <a
              className="focus-ring text-sm underline underline-offset-4"
              href={`/${locale.code}${route}`}
              hrefLang={locale.htmlLang}
            >
              {locale.nativeName}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
