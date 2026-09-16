import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  Cpu,
  LockKeyhole,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getGuideBySlug } from '@/lib/seo/guide-content';
import { TOOL_CATALOG } from '@/lib/seo/tool-catalog-data';

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

const httpsOrigin = ['https:', '//', 'getopentools.com'].join('');

export async function generateStaticParams() {
  return TOOL_CATALOG.filter((t) => t.releaseWave === 'P0' || t.rank <= 5)
    .slice(0, 50)
    .map((tool) => ({ slug: tool.slug }));
}

export async function generateMetadata({
  params,
}: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) return { title: 'Guide Not Found' };

  return {
    title: guide.metaTitle,
    description: guide.metaDescription,
    alternates: {
      canonical: `${httpsOrigin}/guides/${slug}`,
    },
    openGraph: {
      title: guide.metaTitle,
      description: guide.metaDescription,
      url: `${httpsOrigin}/guides/${slug}`,
      siteName: 'OpenTools',
      type: 'article',
    },
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const guide = getGuideBySlug(slug);
  if (!guide) notFound();

  const categoryPillarHref =
    guide.categoryPillar?.href ??
    `/guides/category/${guide.tool.category.toLowerCase()}`;

  return (
    <AppShell currentToolId="home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(guide.jsonLd) }}
      />
      <article
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-7 sm:px-8 lg:px-10 lg:py-9"
      >
        <div className="mx-auto max-w-4xl">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="mb-4">
            <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <li>
                <a href="/" className="hover:text-foreground">
                  Home
                </a>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <a href="/guides" className="hover:text-foreground">
                  Guides
                </a>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <a href={categoryPillarHref} className="hover:text-foreground">
                  {guide.tool.category}
                </a>
              </li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-foreground">{guide.tool.name}</li>
            </ol>
          </nav>

          {/* Header */}
          <header className="border-b pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-3.5 text-success"
                />
                Zero Cloud Egress
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-mono text-muted-foreground">
                <Cpu aria-hidden="true" className="size-3.5" />
                {guide.tool.executionMode}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                100% Free Forever
              </span>
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              {guide.heading}
            </h1>
            <p className="mt-4 text-base leading-7 text-muted-foreground sm:text-lg">
              {guide.leadParagraph}
            </p>

            {/* Direct Answer Box (AEO for Perplexity & Google AI Overviews) */}
            <div className="mt-6 rounded-xl border bg-card p-5">
              <p className="text-xs font-mono font-semibold uppercase tracking-wider text-muted-foreground">
                Quick Summary / Direct Answer
              </p>
              <p className="mt-2 text-sm font-medium leading-6 text-foreground">
                {guide.directAnswer}
              </p>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a
                href={guide.tool.destinationUrl}
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  'h-11 px-5 text-sm font-semibold gap-2',
                )}
                aria-label={`Launch ${guide.tool.name} workbench`}
              >
                Launch {guide.tool.name} Workbench
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
              <a
                href="#how-it-works"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'h-11 px-4 text-sm gap-2',
                )}
                aria-label="Read 3-step operator guide"
              >
                Read 3-Step Guide
              </a>
            </div>
          </header>

          {/* Spec Grid */}
          <section aria-labelledby="specs-heading" className="mt-8">
            <h2 id="specs-heading" className="sr-only">
              Tool Specifications
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Execution
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                  <Cpu aria-hidden="true" className="size-4" />
                  Local Browser RAM
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Server Upload
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                  <ShieldCheck
                    aria-hidden="true"
                    className="size-4 text-success"
                  />
                  0 Cloud Egress
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Speed
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                  <Zap aria-hidden="true" className="size-4 text-success" />
                  Sub-second
                </p>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <p className="text-xs font-medium text-muted-foreground">
                  Cost
                </p>
                <p className="mt-1 flex items-center gap-1.5 text-sm font-semibold">
                  <LockKeyhole aria-hidden="true" className="size-4" />
                  $0 / No Paywall
                </p>
              </div>
            </div>
          </section>

          {/* How-To Steps */}
          <section id="how-it-works" className="mt-12">
            <h2 className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
              How to use {guide.tool.name} in 3 simple steps
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Follow this step-by-step operator guide to process your files
              securely with zero cloud exposure.
            </p>

            <div className="mt-6 space-y-4">
              {guide.steps.map((step, index) => (
                <div
                  key={step.name}
                  className="flex items-start gap-4 rounded-xl border bg-card p-5"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg border bg-muted font-mono text-sm font-semibold">
                    0{index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-semibold">{step.name}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {step.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Comparison Matrix */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
              Local Browser Compute vs. Traditional Cloud Converters
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Why running tools client-side in WebAssembly is faster and
              completely leak-proof.
            </p>

            <div className="mt-6 overflow-x-auto rounded-xl border bg-card">
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Feature / Aspect
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      OpenTools (Local)
                    </th>
                    <th scope="col" className="px-5 py-3 font-semibold">
                      Standard Cloud Converters
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {guide.comparison.map((row) => (
                    <tr key={row.aspect}>
                      <th
                        scope="row"
                        className="whitespace-nowrap px-5 py-3.5 font-medium"
                      >
                        {row.aspect}
                      </th>
                      <td className="px-5 py-3.5 font-semibold text-foreground">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2
                            aria-hidden="true"
                            className="size-4 shrink-0 text-success"
                          />
                          {row.localTools}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {row.traditionalCloud}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Technical Architecture & Visual Flowchart */}
          <section className="mt-12 rounded-xl border bg-muted/40 p-6 sm:p-8">
            <h2 className="text-xl font-semibold tracking-[-0.03em]">
              Security Architecture &amp; Invariant Guarantees
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {guide.technicalArchitecture}
            </p>

            <div className="mt-6 overflow-hidden rounded-xl">
              <div
                className="w-full"
                dangerouslySetInnerHTML={{ __html: guide.diagramSvg }}
              />
            </div>

            <div className="mt-5 rounded-lg border bg-card p-4 font-mono text-xs">
              <span className="text-muted-foreground">CSP Header: </span>
              <span className="font-semibold text-foreground">
                default-src &apos;self&apos;; connect-src &apos;none&apos;;
                object-src &apos;none&apos;;
              </span>
            </div>
          </section>

          {/* Related Workflow Tools Mesh */}
          <section className="mt-12">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h2 className="text-xl font-semibold tracking-[-0.03em]">
                  Related {guide.tool.category} Utilities
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Common next steps and complementary client-side operations.
                </p>
              </div>
              {guide.categoryPillar ? (
                <a
                  href={guide.categoryPillar.href}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  View all {guide.categoryPillar.toolCount} tools →
                </a>
              ) : null}
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {guide.relatedTools.map((rel) => (
                <a
                  key={rel.tool.slug}
                  href={rel.guideHref}
                  className="group rounded-xl border bg-card p-4 transition-colors hover:bg-muted/40"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground group-hover:underline">
                      {rel.tool.name}
                    </span>
                    <span className="rounded-full border bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {rel.tool.executionMode}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {rel.tool.notes ||
                      `Run ${rel.tool.name.toLowerCase()} locally in your browser tab.`}
                  </p>
                  <p className="mt-2 text-[11px] font-mono text-muted-foreground">
                    {rel.relationship} →
                  </p>
                </a>
              ))}
            </div>
          </section>

          {/* FAQs */}
          <section className="mt-12">
            <h2 className="text-xl font-semibold tracking-[-0.03em] sm:text-2xl">
              Frequently Asked Questions
            </h2>
            <div className="mt-6 space-y-4">
              {guide.faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="rounded-xl border bg-card p-5"
                >
                  <h3 className="text-base font-semibold">{faq.question}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Bottom Launch Banner */}
          <div className="mt-12 rounded-2xl border bg-card p-6 text-center sm:p-8">
            <h2 className="text-2xl font-semibold tracking-[-0.03em]">
              Ready to use {guide.tool.name}?
            </h2>
            <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
              Open the interactive workspace directly in your browser. Free
              forever, no registration, 100% private.
            </p>
            <div className="mt-5 flex justify-center">
              <a
                href={guide.tool.destinationUrl}
                className={cn(
                  buttonVariants({ variant: 'default', size: 'lg' }),
                  'h-11 px-6 text-sm font-semibold gap-2',
                )}
                aria-label={`Start using ${guide.tool.name} free`}
              >
                Start Using {guide.tool.name} Free
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
            </div>
          </div>
        </div>
      </article>
    </AppShell>
  );
}
