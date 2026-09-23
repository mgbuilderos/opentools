import type { ReactNode } from 'react';
import type { Metadata } from 'next';
import { shareImages, shareTwitterCard } from '@/lib/seo/share-images';
import { notFound } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Clock,
  HelpCircle,
  ListTree,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { buttonVariants } from '@/components/ui/button';
import { isLiveToolUrl } from '@/lib/seo/live-tools';
import { cn } from '@/lib/utils';
import { getAllBlogPosts, getBlogPostBySlug } from '@/lib/seo/blog-data';

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

const httpsScheme = ['https:', '//'].join('');
const httpsOrigin = `${httpsScheme}getopentools.com`;
const schemaContext = `${httpsScheme}schema.org`;

export const revalidate = 86400;

/** A slug outside `generateStaticParams` is a 404, not a render. Without this,
 * any unknown URL -- a typo, a stale link, a crawler probing -- starts a React
 * render on a Worker with a 10ms CPU budget. */
export const dynamicParams = false;

export async function generateStaticParams() {
  return getAllBlogPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) return { title: 'Article Not Found' };

  return {
    /*
      The post's own title, and nothing else. `| OpenTools Engineering Blog`
      cost 29 characters before the layout's ` · OpenTools` added twelve more,
      which put all 30 posts past what a result shows -- the site was named
      three times over and the article once, at the end.
    */
    title: post.title,
    description: post.metaDescription,
    keywords: [...post.keywords],
    alternates: {
      canonical: `${httpsOrigin}/blog/${slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      url: `${httpsOrigin}/blog/${slug}`,
      siteName: 'OpenTools',
      type: 'article',
      publishedTime: post.publishedAt,
      authors: [post.author],
      images: shareImages('blog'),
    },
    twitter: shareTwitterCard('blog', post.title, post.metaDescription),
  };
}

function renderInlineMarkdown(text: string): ReactNode[] {
  const tokenRegex = /(\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[2] && match[3]) {
      const linkText = match[2];
      const linkUrl = match[3];
      const isExternal = linkUrl.startsWith('http');
      parts.push(
        <a
          key={match.index}
          href={linkUrl}
          target={isExternal ? '_blank' : undefined}
          rel={isExternal ? 'noopener noreferrer' : undefined}
          className="font-medium text-foreground underline decoration-muted-foreground/50 underline-offset-4 transition-colors hover:decoration-foreground"
        >
          {linkText}
        </a>,
      );
    } else if (match[4]) {
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {match[4]}
        </strong>,
      );
    } else if (match[5]) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-xs font-medium text-foreground border border-border/40"
        >
          {match[5]}
        </code>,
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

function renderFormattedContent(text: string) {
  const paragraphs = text.split(/\n\n+/);

  return paragraphs.map((para, pIdx) => {
    const trimmed = para.trim();

    // Check for code blocks
    if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
      const firstLineEnd = trimmed.indexOf('\n');
      const lang = trimmed.slice(3, firstLineEnd).trim();
      const code = trimmed.slice(firstLineEnd + 1, -3);

      return (
        <div
          key={pIdx}
          className="my-4 overflow-hidden rounded-xl border bg-muted/60 font-mono text-xs"
        >
          {lang ? (
            <div className="flex items-center justify-between border-b bg-muted px-4 py-1.5 text-[11px] text-muted-foreground">
              <span>{lang}</span>
              <span className="opacity-60">read-only</span>
            </div>
          ) : null}
          <pre className="overflow-x-auto p-4 leading-5 text-foreground">
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    // Check for markdown tables
    if (trimmed.includes('|') && trimmed.includes('\n|')) {
      const rows = trimmed
        .split('\n')
        .map((r) => r.trim())
        .filter((r) => r.startsWith('|') && r.endsWith('|'));

      if (rows.length >= 2) {
        const headerCells = rows[0]
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());
        const dataRows = rows.slice(2).map((row) =>
          row
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim()),
        );

        return (
          <div
            key={pIdx}
            className="my-4 overflow-x-auto rounded-xl border bg-card"
          >
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-muted/50 font-semibold text-foreground">
                <tr>
                  {headerCells.map((h, hIdx) => (
                    <th key={hIdx} className="px-4 py-2.5">
                      {renderInlineMarkdown(h)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y text-muted-foreground">
                {dataRows.map((dRow, rIdx) => (
                  <tr key={rIdx} className="hover:bg-muted/30">
                    {dRow.map((cell, cIdx) => (
                      <td key={cIdx} className="px-4 py-2.5">
                        {renderInlineMarkdown(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
    }

    // Check for blockquotes / callout notes
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed
        .split('\n')
        .map((line) => line.replace(/^>\s?/, ''))
        .join(' ');
      return (
        <blockquote
          key={pIdx}
          className="my-4 rounded-xl border-l-4 border-foreground bg-muted/40 p-4 text-sm leading-6 text-foreground italic"
        >
          {renderInlineMarkdown(quoteText)}
        </blockquote>
      );
    }

    // Check for bullet lists (- or *)
    const lines = trimmed.split('\n');
    if (
      lines.length > 1 &&
      lines.every((l) => l.trim().startsWith('- ') || l.trim().startsWith('* '))
    ) {
      return (
        <ul
          key={pIdx}
          className="my-3 list-disc space-y-1.5 pl-6 text-sm leading-6 text-muted-foreground"
        >
          {lines.map((line, lIdx) => {
            const itemText = line.trim().replace(/^[-*]\s+/, '');
            return <li key={lIdx}>{renderInlineMarkdown(itemText)}</li>;
          })}
        </ul>
      );
    }

    // Check for numbered lists (1. 2. 3.)
    if (lines.length > 1 && lines.every((l) => /^\d+\.\s+/.test(l.trim()))) {
      return (
        <ol
          key={pIdx}
          className="my-3 list-decimal space-y-1.5 pl-6 text-sm leading-6 text-muted-foreground"
        >
          {lines.map((line, lIdx) => {
            const itemText = line.trim().replace(/^\d+\.\s+/, '');
            return <li key={lIdx}>{renderInlineMarkdown(itemText)}</li>;
          })}
        </ol>
      );
    }

    // Regular paragraph
    return (
      <p key={pIdx} className="text-base leading-7 text-muted-foreground">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPostBySlug(slug);
  if (!post) notFound();

  const relatedPosts = post.relatedSlugs
    .map((rSlug) => getBlogPostBySlug(rSlug))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const jsonLd = {
    '@context': schemaContext,
    '@graph': [
      {
        '@type': 'BlogPosting',
        headline: post.title,
        description: post.metaDescription,
        keywords: post.keywords.join(', '),
        datePublished: post.publishedAt,
        dateModified: post.publishedAt,
        author: {
          '@type': 'Organization',
          name: post.author,
          url: httpsOrigin,
        },
        publisher: {
          '@type': 'Organization',
          name: 'OpenTools',
          url: httpsOrigin,
        },
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': `${httpsOrigin}/blog/${slug}`,
        },
      },
      {
        '@type': 'FAQPage',
        mainEntity: post.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer,
          },
        })),
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
            name: 'Blog',
            item: `${httpsOrigin}/blog`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: post.title,
            item: `${httpsOrigin}/blog/${slug}`,
          },
        ],
      },
    ],
  };

  return (
    <AppShell currentToolId="home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <article
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12"
      >
        <div className="mx-auto max-w-4xl space-y-10">
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
                <a href="/blog" className="hover:text-foreground">
                  Blog
                </a>
              </li>
              <li aria-hidden="true">/</li>
              <li className="font-medium text-foreground truncate max-w-[240px] sm:max-w-none">
                {post.title}
              </li>
            </ol>
          </nav>

          {/* Article Header */}
          <header className="space-y-4 border-b pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border bg-muted px-2.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
                {post.category}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                <ShieldCheck
                  aria-hidden="true"
                  className="size-3.5 text-success"
                />
                Zero Server Uploads
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="size-3" />
                {post.readingTime}
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="size-3" />
                {post.publishedAt}
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              {post.title}
            </h1>
            <p className="text-base leading-7 text-muted-foreground sm:text-lg">
              {post.summary}
            </p>
          </header>

          {/* Interactive Tool Launcher Callout Box (Only displayed when tool is live) */}
          {isLiveToolUrl(post.toolDestination) ? (
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="size-4 text-foreground" />
                    <span className="font-mono text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Try The Interactive Tool Now
                    </span>
                  </div>
                  <h2 className="mt-1 text-lg font-bold text-foreground">
                    {post.toolName}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    100% In-browser execution. Zero server uploads, instant
                    results, free forever.
                  </p>
                </div>
                <a
                  href={post.toolDestination}
                  aria-label={`Open interactive ${post.toolName}`}
                  className={cn(
                    buttonVariants({ variant: 'default', size: 'sm' }),
                    'h-10 px-5 text-xs font-semibold shrink-0 gap-2',
                  )}
                >
                  Open Workbench
                  <ArrowRight className="size-4" />
                </a>
              </div>
            </div>
          ) : null}

          {/* Table of Contents */}
          <div className="rounded-xl border bg-muted/30 p-5">
            <div className="flex items-center gap-2 mb-3 font-semibold text-sm">
              <ListTree className="size-4" />
              <span>Table of Contents</span>
            </div>
            <ul className="space-y-1.5 text-xs">
              {post.sections.map((section, sIdx) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {sIdx + 1}. {section.heading}
                  </a>
                </li>
              ))}
              {post.faqs.length ? (
                <li>
                  <a
                    href="#faqs"
                    className="text-muted-foreground hover:text-foreground hover:underline"
                  >
                    {post.sections.length + 1}. Frequently Asked Questions (FAQ)
                  </a>
                </li>
              ) : null}
            </ul>
          </div>

          {/* Article Sections */}
          <div className="space-y-10">
            {post.sections.map((section) => (
              <section key={section.id} id={section.id} className="space-y-4">
                <h2 className="text-2xl font-bold tracking-tight text-foreground border-b pb-2">
                  {section.heading}
                </h2>
                <div className="space-y-4">
                  {renderFormattedContent(section.content)}
                </div>
              </section>
            ))}
          </div>

          {/* Frequently Asked Questions */}
          {post.faqs.length ? (
            <section id="faqs" className="space-y-6 border-t pt-8">
              <div className="flex items-center gap-2">
                <HelpCircle className="size-5" />
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Frequently Asked Questions (FAQ)
                </h2>
              </div>
              <div className="space-y-4">
                {post.faqs.map((faq, index) => (
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

          {/* Related Articles & Companion Tools */}
          {relatedPosts.length ? (
            <section className="space-y-6 border-t pt-8">
              <div className="flex items-center gap-2">
                <BookOpen className="size-5" />
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Related Guides &amp; Solutions
                </h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {relatedPosts.map((rPost) => (
                  <div
                    key={rPost.slug}
                    className="rounded-xl border bg-card p-5 flex flex-col justify-between"
                  >
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {rPost.category}
                      </span>
                      <h3 className="mt-2 text-sm font-semibold text-foreground line-clamp-2">
                        <a
                          href={`/blog/${rPost.slug}`}
                          className="hover:underline"
                        >
                          {rPost.title}
                        </a>
                      </h3>
                    </div>
                    <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        {rPost.readingTime}
                      </span>
                      <a
                        href={`/blog/${rPost.slug}`}
                        className="font-medium text-foreground hover:underline inline-flex items-center gap-1"
                        aria-label={`Read ${rPost.title}`}
                      >
                        Read
                        <ArrowRight className="size-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {/* Bottom Call to Action */}
          {isLiveToolUrl(post.toolDestination) ? (
            <div className="rounded-2xl border bg-muted/40 p-8 text-center space-y-4">
              <h3 className="text-xl font-bold text-foreground">
                Ready to use {post.toolName}?
              </h3>
              <p className="max-w-xl mx-auto text-sm text-muted-foreground">
                Execute this workflow privately on your device right now without
                creating an account or paying for cloud API credits.
              </p>
              <div>
                <a
                  href={post.toolDestination}
                  aria-label={`Launch ${post.toolName}`}
                  className={cn(
                    buttonVariants({ variant: 'default', size: 'lg' }),
                    'h-11 px-6 text-sm font-semibold gap-2',
                  )}
                >
                  Launch {post.toolName}
                  <ArrowRight className="size-4" />
                </a>
              </div>
            </div>
          ) : null}
        </div>
      </article>
    </AppShell>
  );
}
