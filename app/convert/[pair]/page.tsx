import type { Metadata } from 'next';
import { FormatConverterTool } from '@/components/format-converter-tool';
import { ImagePairConverterTool } from '@/components/image-pair-converter-tool';
import { MathWorkbenchTool } from '@/components/math-workbench-tool';
import { relatedToolsFor } from '@/lib/seo/related-tools';
import {
  CONVERSION_PAIRS,
  conversionFacts,
  conversionPairById,
} from '@/lib/seo/conversion-pairs';
import {
  FORMAT_PAIRS,
  formatFacts,
  formatPairById,
} from '@/lib/seo/format-pairs';
import {
  IMAGE_PAIRS,
  imagePairFacts,
  imageSeoPairById,
} from '@/lib/seo/image-pairs';
import { ToolJsonLd } from '@/components/tool-json-ld';

/*
  One page per conversion pair, which is the next order of magnitude after one
  page per tool.

  Giving every calculator its own URL fixed the first half of the problem: 533
  tools that had shared one address now have 626 of their own. It did not fix
  this half. "cm to inches", "km to miles" and "kg to lbs" are three searches
  with three answers, and all three landed on `/math/distance-converter`, a
  page whose title is "Distance converter" and whose converter opens on
  whatever units the operation happens to default to. A converter is not one
  search intent; it is every pair it supports.

  TWO KINDS OF PAIR ANSWER HERE, and the second is why this route was reopened.
  Unit pairs (`centimetres-to-inches`) are answered inside Google's own results
  by a widget, so 512 of them produced 15 page-opens on 2026-09-23. File-format
  pairs (`csv-to-yaml`) cannot be: converting a file needs a converter, so the
  person has to open one. `lib/seo/format-pairs.ts` derives those pairs from
  the one parser and one emitter each format already has in
  `lib/tools/notation/table`, so the same registration, the same sitemap and
  the same tests cover both families with nothing new to remember.

  WHAT KEEPS THIS OFF THE THIN-PAGE PILE. Constraint C4 forbids a new family of
  near-template pages while decision 11 de-indexes ~430 of the last one, and it
  is right to. The difference is not the wording, it is the work: the converter
  arrives already set to the pair in the URL, and the factor, the sample and
  the worked result above it are produced by calling the functions the tool
  itself runs, at build time. Every page therefore carries output no other page
  carries, and no sentence on it can drift from the tool, because no sentence
  on it was written about the tool. A pair the converter cannot actually
  perform produces no page.

  `dynamicParams = false` means a slug that is not a real pair 404s at the edge
  rather than rendering a fallback, so no URL can claim a conversion the page
  is not doing. Abbreviated spellings people type -- `cm-to-in`, `kg-to-lbs` --
  are permanent redirects to the canonical page rather than pages of their own,
  so no signal is split; see `lib/seo/conversion-aliases.ts`.

  No `revalidate`: these pages in the Cloudflare KV page cache would cost more
  than twice the free-plan allowance of about 1,000 writes a day, and every
  deploy invalidates the lot. They are prerendered to static assets instead,
  which is free. See docs/CACHE_BUDGET.md.
*/

const CANONICAL_ORIGIN = ['https:', '//', 'getopentools.com'].join('');

export const dynamicParams = false;

export function generateStaticParams() {
  return [...CONVERSION_PAIRS, ...FORMAT_PAIRS, ...IMAGE_PAIRS].map((pair) => ({
    pair: pair.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pair: string }>;
}): Promise<Metadata> {
  const { pair: slug } = await params;
  const alternates = { canonical: `${CANONICAL_ORIGIN}/convert/${slug}` };

  const unit = conversionPairById(slug);
  if (unit) {
    return {
      title: unit.title,
      description: conversionFacts(unit).description,
      alternates,
    };
  }

  const format = formatPairById(slug);
  if (format) {
    return {
      title: format.title,
      description: formatFacts(format).description,
      alternates,
    };
  }

  const image = imageSeoPairById(slug);
  if (image) {
    return {
      title: image.title,
      description: imagePairFacts(image).description,
      alternates,
    };
  }
  return {};
}

async function renderToolPage({
  params,
}: {
  params: Promise<{ pair: string }>;
}) {
  const { pair: slug } = await params;

  const unit = conversionPairById(slug);
  if (unit) {
    const facts = conversionFacts(unit);
    return (
      <MathWorkbenchTool
        initialOperationId={unit.operationId}
        relatedTools={relatedToolsFor(`/convert/${slug}`)}
        pair={{
          title: unit.title,
          summary: facts.description,
          relationship: facts.relationship,
          examples: facts.examples,
          from: unit.from,
          to: unit.to,
          units: facts.units,
          routes: facts.routes,
        }}
      />
    );
  }

  const image = imageSeoPairById(slug);
  if (image) {
    const imageFacts = imagePairFacts(image);
    return (
      <ImagePairConverterTool
        relatedTools={relatedToolsFor(`/convert/${slug}`)}
        pair={{
          title: image.title,
          summary: imageFacts.description,
          measured: imageFacts.measured,
          from: image.from.id,
          to: image.to.id,
          formats: imageFacts.formats,
          routes: imageFacts.routes,
          extension: imageFacts.extension,
          needsDecoder: imageFacts.needsDecoder,
        }}
      />
    );
  }

  const format = formatPairById(slug);
  if (!format) return null;
  const facts = formatFacts(format);
  return (
    <FormatConverterTool
      relatedTools={relatedToolsFor(`/convert/${slug}`)}
      pair={{
        title: format.title,
        summary: facts.description,
        measured: facts.measured,
        sample: facts.sample,
        output: facts.output,
        from: format.from,
        to: format.to,
        formats: facts.formats,
        routes: facts.routes,
        extension: facts.extension,
      }}
    />
  );
}

/*
  The structured data and the page, in that order.

  The body above is unchanged apart from its name: it has several returns and
  one of them is `null`, so rather than threading a script tag through every
  branch it is rendered once here and the JSON-LD placed beside whatever it
  produced. A branch that renders nothing gets no structured data either, which
  is the right answer -- there is no tool at that URL to describe. Lowercase
  because `react-compiler` reserves capitalised calls for JSX components.

  `generateMetadata` above is the single source of the name and description, so
  the sentence a machine reads is the sentence the search result shows.
*/
export default async function Page(props: {
  params: Promise<{ pair: string }>;
}) {
  const rendered = await renderToolPage(props);
  if (rendered === null) return null;
  const { pair } = await props.params;
  return (
    <>
      <ToolJsonLd
        route={`/convert/${pair}`}
        meta={await generateMetadata(props)}
      />
      {rendered}
    </>
  );
}
