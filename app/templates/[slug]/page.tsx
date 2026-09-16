import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  CheckCircle2,
  FolderGit2,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { TemplateClientCustomizer } from '@/components/templates/template-client-customizer';
import {
  getAllTemplates,
  getTemplateBySlug,
} from '@/lib/templates/templates-data';

interface TemplatePageProps {
  params: Promise<{ slug: string }>;
}

const httpsScheme = ['https:', '//'].join('');
const httpsOrigin = `${httpsScheme}getopentools.com`;
const schemaContext = `${httpsScheme}schema.org`;

export async function generateStaticParams() {
  return getAllTemplates().map((template) => ({ slug: template.slug }));
}

export async function generateMetadata({
  params,
}: TemplatePageProps): Promise<Metadata> {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);
  if (!template) return { title: 'Template Not Found' };

  return {
    title: `${template.title} | Free Open-Source Template`,
    description: template.metaDescription,
    keywords: [...template.keywords],
    alternates: {
      canonical: `${httpsOrigin}/templates/${slug}`,
    },
    openGraph: {
      title: template.title,
      description: template.metaDescription,
      url: `${httpsOrigin}/templates/${slug}`,
      siteName: 'OpenTools',
      type: 'website',
    },
  };
}

export default async function TemplateDetailPage({
  params,
}: TemplatePageProps) {
  const { slug } = await params;
  const template = getTemplateBySlug(slug);
  if (!template) notFound();

  const otherTemplates = getAllTemplates()
    .filter((t) => t.slug !== slug && t.category === template.category)
    .slice(0, 3);

  const jsonLd = {
    '@context': schemaContext,
    '@graph': [
      {
        '@type': 'DigitalDocument',
        name: template.title,
        description: template.metaDescription,
        keywords: template.keywords.join(', '),
        fileFormat: template.format,
        author: {
          '@type': 'Organization',
          name: 'OpenTools',
          url: httpsOrigin,
        },
        publisher: {
          '@type': 'Organization',
          name: 'OpenTools',
          url: httpsOrigin,
        },
        url: `${httpsOrigin}/templates/${slug}`,
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: httpsOrigin,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Templates',
            item: `${httpsOrigin}/templates`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: template.title,
            item: `${httpsOrigin}/templates/${slug}`,
          },
        ],
      },
      {
        '@type': 'FAQPage',
        mainEntity: template.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
      },
    ],
  };

  return (
    <AppShell currentToolId="home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-5xl space-y-10">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <li>
                <a href="/" className="hover:text-foreground">
                  Home
                </a>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <a href="/templates" className="hover:text-foreground">
                  Templates
                </a>
              </li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-foreground truncate max-w-[240px] sm:max-w-none">
                {template.title}
              </li>
            </ol>
          </nav>

          {/* Template Header */}
          <header className="space-y-4 border-b pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border bg-muted px-2.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
                {template.category}
              </span>
              <span className="rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold text-foreground">
                {template.format}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-3.5 text-success"
                />
                100% Free &amp; Open Source
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {template.title}
            </h1>
            <p className="max-w-3xl text-base leading-7 text-muted-foreground sm:text-lg">
              {template.description}
            </p>
          </header>

          {/* Target Audience & Key Features Box */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <Users className="size-4 text-muted-foreground" />
                <span>Designed For</span>
              </div>
              <p className="text-xs leading-5 text-muted-foreground">
                {template.targetAudience}
              </p>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
              <div className="flex items-center gap-2 font-semibold text-sm text-foreground">
                <Sparkles className="size-4 text-muted-foreground" />
                <span>Companion OpenTools Utility</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {template.relatedToolName}
                </span>
                <Button
                  nativeButton={false}
                  size="sm"
                  variant="outline"
                  render={
                    <a
                      href={template.relatedToolHref}
                      className="inline-flex items-center gap-1 text-xs"
                    >
                      Open Tool
                      <ArrowRight className="size-3" />
                    </a>
                  }
                  className="h-8 px-3 text-xs"
                >
                  Open Tool
                  <ArrowRight className="size-3" />
                </Button>
              </div>
            </div>
          </div>

          {/* Key Features List */}
          <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">
              What&apos;s Included in this Template
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {template.features.map((feature, fIdx) => (
                <div key={fIdx} className="flex items-start gap-2.5 text-xs">
                  <CheckCircle2 className="size-4 shrink-0 text-success mt-0.5" />
                  <span className="leading-5 text-muted-foreground">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Customizer & Download Component */}
          <section className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-foreground">
              Access &amp; Download Template
            </h2>
            <TemplateClientCustomizer template={template} />
          </section>

          {/* Frequently Asked Questions */}
          {template.faqs.length ? (
            <section className="space-y-6 border-t pt-8">
              <div className="flex items-center gap-2">
                <HelpCircle className="size-5" />
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Frequently Asked Questions (FAQ)
                </h2>
              </div>
              <div className="space-y-4">
                {template.faqs.map((faq, index) => (
                  <div key={index} className="rounded-xl border bg-card p-5">
                    <h3 className="text-base font-semibold text-foreground">
                      {faq.question}
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Related Templates in Same Category */}
          {otherTemplates.length ? (
            <section className="space-y-6 border-t pt-8">
              <div className="flex items-center gap-2">
                <FolderGit2 className="size-5" />
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  More in {template.category}
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {otherTemplates.map((oTemp) => (
                  <div
                    key={oTemp.slug}
                    className="rounded-xl border bg-card p-5 flex flex-col justify-between"
                  >
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {oTemp.format}
                      </span>
                      <h4 className="mt-2 text-sm font-semibold text-foreground line-clamp-2">
                        <a
                          href={`/templates/${oTemp.slug}`}
                          className="hover:underline"
                        >
                          {oTemp.title}
                        </a>
                      </h4>
                    </div>
                    <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
                      <span className="text-muted-foreground font-mono text-[11px]">
                        {oTemp.badge}
                      </span>
                      <a
                        href={`/templates/${oTemp.slug}`}
                        className="font-medium text-foreground hover:underline inline-flex items-center gap-1"
                        aria-label={`View ${oTemp.title}`}
                      >
                        View
                        <ArrowRight className="size-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
