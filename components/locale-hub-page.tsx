import { LanguageSwitcher } from '@/components/language-switcher';
import { LOCALE_COPY } from '@/lib/i18n/copy';
import { requireLocale } from '@/lib/i18n/locales';
import { LOCALIZED_TOOL_ROUTES, localizedPath } from '@/lib/i18n/routes';

/*
  One component for all eight locale hubs (`/es`, `/ja`, ...).

  A server component with no `'use client'`, for the same reason
  `CategoryHubPage` is one: the whole job of this page is to put the links to
  every localised tool into the prerendered HTML, so a crawler that lands on
  `/es` reaches all five Spanish tool pages in one hop. A client-rendered list
  would reach none of them.

  `lang` here is belt and braces. `<html lang>` is the attribute that matters
  and it is set correctly for all 48 localised pages by
  `scripts/localize-html-lang.mjs`, which runs in the build and is checked by
  `scripts/verify-html-lang.mjs` -- read the first of those for why the
  attribute is set there and not by a route group. Declaring it on this element
  too costs nothing, is valid on any element, and means the subtree still
  announces its language if the page is ever served from somewhere that skipped
  the build step.
*/

export function LocaleHubPage({ localeCode }: { localeCode: string }) {
  const locale = requireLocale(localeCode);
  const copy = LOCALE_COPY[localeCode];
  if (!copy) {
    throw new Error(`No copy is registered for "${localeCode}"`);
  }
  const { hub } = copy;

  return (
    <main
      lang={locale.htmlLang}
      className="min-h-screen bg-muted/30 px-4 py-5 sm:px-6 sm:py-10 lg:px-8"
    >
      <div className="mx-auto max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {hub.heading}
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          {hub.intro}
        </p>

        <h2 className="mt-10 text-xl font-semibold tracking-tight">
          {hub.toolsHeading}
        </h2>
        <ul className="mt-4 space-y-3">
          {LOCALIZED_TOOL_ROUTES.map((route) => {
            const depth = copy.tools[route];
            if (!depth) return null;
            return (
              <li key={route}>
                <a
                  href={localizedPath(localeCode, route)}
                  className="focus-ring block rounded-lg border border-border bg-background p-4 hover:border-foreground/30"
                >
                  <span className="block font-medium">{depth.title}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    {depth.description}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>

        <h2 className="mt-10 text-xl font-semibold tracking-tight">
          {hub.privacyHeading}
        </h2>
        {hub.privacyBody.map((paragraph) => (
          <p
            key={paragraph.slice(0, 32)}
            className="mt-3 text-base leading-relaxed text-muted-foreground"
          >
            {paragraph}
          </p>
        ))}

        <LanguageSwitcher
          currentCode={localeCode}
          route=""
          label={hub.switcherLabel}
          englishLabel={hub.englishLinkLabel}
        />
      </div>
    </main>
  );
}
