'use client';

import { HelpCircle, ShieldCheck, WifiOff } from 'lucide-react';

import type { ToolPageDepth } from '@/lib/seo/tool-page-depth-types';

const schemaContext = ['https:', '//', 'schema.org'].join('');

/*
  The written half of a PDF or image tool page.

  These 32 routes are the most commercially valuable pages on the site and were
  measured, on 2026-09-23, as the thinnest: `/pdf/merge` carried 281 words
  against 1,348 on `/guides/pdf-merge-pdf`, which is the page that cannot merge
  anything. Both were competing for "merge pdf". This block is what moves the
  guide's substance onto the URL that should win it, so one page carries the
  whole signal instead of two pages splitting it.

  WHAT IS EMITTED AS STRUCTURED DATA, AND WHY ONLY THAT.

  `HowTo` from `steps` and `FAQPage` from `faqs`, and nothing else. Both are
  generated from the very text rendered above them -- not from a parallel copy
  that can drift -- so what an answer engine quotes is what a reader sees. No
  `SoftwareApplication` rating, no `AggregateRating`: there are no reviews to
  aggregate, and inventing them is exactly the kind of claim this project's
  rules forbid.

  Plain `<a>` and no `next/link`: `lib/tools/local-source-policy.test.ts` bans
  it in this directory, and a client-side route change would fetch the next
  page's payload rather than load the page.
*/
export function PageDepthContent({ content }: { content: ToolPageDepth }) {
  const howTo =
    content.steps.length > 0
      ? {
          '@context': schemaContext,
          '@type': 'HowTo',
          name: content.heading,
          description: content.directAnswer,
          totalTime: 'PT2M',
          supply: [],
          tool: [],
          step: content.steps.map((step, index) => ({
            '@type': 'HowToStep',
            position: index + 1,
            name: step.name,
            text: step.text,
          })),
        }
      : null;

  const faqPage =
    content.faqs.length > 0
      ? {
          '@context': schemaContext,
          '@type': 'FAQPage',
          mainEntity: content.faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: { '@type': 'Answer', text: faq.answer },
          })),
        }
      : null;

  return (
    <section
      aria-labelledby="page-depth-heading"
      className="mx-auto mt-2 max-w-4xl px-4 pb-14 sm:px-8 lg:px-10"
    >
      <div className="border-t pt-8">
        <h2 id="page-depth-heading" className="text-lg font-semibold">
          {content.heading}
        </h2>

        <p className="mt-3 text-[15px] leading-7">{content.directAnswer}</p>
        <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
          {content.lead}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
            <ShieldCheck aria-hidden="true" className="size-3.5 text-success" />
            Runs in this tab — no upload
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Free, no account, no watermark
          </span>
          {content.offlineReady ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
              <WifiOff aria-hidden="true" className="size-3.5" />
              Kept for use with the network off
            </span>
          ) : null}
        </div>

        {content.steps.length > 0 ? (
          <div className="mt-8">
            <h3 className="text-base font-semibold">Step by step</h3>
            <ol className="mt-4 space-y-3">
              {content.steps.map((step, index) => (
                <li
                  key={step.name}
                  className="flex items-start gap-3 rounded-xl border bg-card p-4"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg border bg-muted font-mono text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {step.name}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-muted-foreground">
                      {step.text}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>
        ) : null}

        {content.sections.map((section) => (
          <div key={section.heading} className="mt-8">
            <h3 className="text-base font-semibold">{section.heading}</h3>
            {section.body.map((paragraph) => (
              <p
                key={paragraph.slice(0, 48)}
                className="mt-3 text-sm leading-7 text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}
          </div>
        ))}

        {content.faqs.length > 0 ? (
          <div className="mt-8">
            <h3 className="flex items-center gap-2 text-base font-semibold">
              <HelpCircle aria-hidden="true" className="size-4" />
              Questions people ask
            </h3>
            <dl className="mt-4 space-y-5">
              {content.faqs.map((faq) => (
                <div key={faq.question}>
                  <dt className="text-sm font-semibold">{faq.question}</dt>
                  <dd className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    {faq.answer}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>

      {howTo ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }}
        />
      ) : null}
      {faqPage ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPage) }}
        />
      ) : null}
    </section>
  );
}
