'use client';

import { HelpCircle } from 'lucide-react';

import type { GuideDetail } from '@/lib/seo/guide-content';

const schemaContext = ['https:', '//', 'schema.org'].join('');

/**
 * The hand-written explanation of one tool, shown on the tool's own page.
 *
 * WHY IT IS HERE AND NOT ON A GUIDE. Guide consolidation kept 15 guide pages
 * and sent the other 552 URLs to their tool pages by 301. Measured on
 * production 2026-09-21, those tool pages carried between 37 and 259 visible
 * words: `/developer/uuid-generator` had 37. So the redirects were landing
 * somewhere thinner than the pages they replaced, while 45 hand-verified
 * explainers sat behind URLs that no longer render.
 *
 * Every sentence rendered here was written from the tool's own engine and
 * tests — including what it refuses, where it stops, and the defects found
 * while reading it. That honesty is the point: a page that only lists features
 * reads like every other tool page, and a reader has no way to tell whether
 * anybody checked.
 *
 * The FAQ block is also emitted as `FAQPage` structured data, because these
 * answers are written to stand alone and that is the form answer engines
 * quote. The same content therefore serves a reader, a crawler and an
 * assistant without being written three times.
 */
export function ToolExplainer({
  detail,
  toolName,
}: {
  detail: GuideDetail;
  toolName: string;
}) {
  return (
    <section
      aria-labelledby="tool-explainer-heading"
      className="mt-8 border-t pt-8"
    >
      <h2 id="tool-explainer-heading" className="text-lg font-semibold">
        About the {toolName}
      </h2>

      <p className="mt-3 text-[15px] leading-7">{detail.directAnswer}</p>
      <p className="mt-4 text-[15px] leading-7 text-muted-foreground">
        {detail.leadParagraph}
      </p>

      {detail.faqs.length > 0 ? (
        <div className="mt-8">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <HelpCircle aria-hidden="true" className="size-4" />
            Questions people ask
          </h3>
          <dl className="mt-4 space-y-5">
            {detail.faqs.map((faq) => (
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

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': schemaContext,
            '@type': 'FAQPage',
            mainEntity: detail.faqs.map((faq) => ({
              '@type': 'Question',
              name: faq.question,
              acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
          }),
        }}
      />
    </section>
  );
}
