import type { Metadata } from 'next';
import { ArrowRight, BookOpen, Calendar, Clock } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { getAllBlogCategories, getAllBlogPosts } from '@/lib/seo/blog-data';

const httpsScheme = ['https:', '//'].join('');
const httpsOrigin = `${httpsScheme}getopentools.com`;
const schemaContext = `${httpsScheme}schema.org`;

export const metadata: Metadata = {
  title: 'Blog & Engineering Playbooks — 100% Private In-Browser Tools',
  description:
    'In-depth technical tutorials, security deep-dives, and workflow playbooks for modern developers, creators, and professionals using zero-egress browser tools.',
  alternates: {
    canonical: `${httpsOrigin}/blog`,
  },
  openGraph: {
    title: 'OpenTools Blog & Engineering Playbooks',
    description:
      'Technical tutorials, privacy analyses, and step-by-step guides for zero-egress browser tools.',
    url: `${httpsOrigin}/blog`,
    siteName: 'OpenTools',
    type: 'website',
  },
};

export default function BlogDirectoryPage() {
  const posts = getAllBlogPosts();
  const categories = getAllBlogCategories();
  const featuredPost = posts[0];
  const remainingPosts = posts.slice(1);

  const jsonLd = {
    '@context': schemaContext,
    '@type': 'CollectionPage',
    name: 'OpenTools Blog & Engineering Playbooks',
    description:
      'Technical tutorials, security deep-dives, and workflow playbooks for in-browser, zero-egress tools.',
    url: `${httpsOrigin}/blog`,
    publisher: {
      '@type': 'Organization',
      name: 'OpenTools',
      url: httpsOrigin,
    },
    breadcrumb: {
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
      ],
    },
  };

  return (
    <AppShell currentToolId="home">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="min-w-0 px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto max-w-6xl space-y-12">
          {/* Hero Header */}
          <div className="space-y-4 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-mono font-medium text-muted-foreground">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Engineering Blog &amp; Solution Playbooks</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              OpenTools Engineering Blog
            </h1>
            <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
              Practical guides, privacy breakdowns, and operator tutorials on
              how to build and work faster using 100% client-side, zero-egress
              browser tools.
            </p>
          </div>

          {/* Featured Article Card */}
          {featuredPost ? (
            <div className="group relative overflow-hidden rounded-2xl border bg-card p-6 sm:p-8 transition-colors hover:border-foreground/40">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="rounded-full border bg-muted px-2.5 py-0.5 font-mono text-[11px] font-medium text-foreground">
                  {featuredPost.category}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  {featuredPost.readingTime}
                </span>
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="size-3" />
                  {featuredPost.publishedAt}
                </span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl group-hover:text-foreground">
                <a
                  href={`/blog/${featuredPost.slug}`}
                  className="hover:underline"
                >
                  {featuredPost.title}
                </a>
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base line-clamp-3">
                {featuredPost.summary}
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <Button
                  nativeButton={false}
                  size="sm"
                  render={
                    <a
                      href={`/blog/${featuredPost.slug}`}
                      aria-label={`Read ${featuredPost.title}`}
                      className="inline-flex items-center gap-1.5"
                    >
                      Read Full Article
                      <ArrowRight className="size-3.5" />
                    </a>
                  }
                  className="h-10 px-4 text-xs font-semibold"
                >
                  Read Full Article
                  <ArrowRight className="size-3.5" />
                </Button>
                <Button
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                  render={
                    <a
                      href={featuredPost.toolDestination}
                      aria-label={`Open ${featuredPost.toolName}`}
                      className="inline-flex items-center gap-1.5"
                    >
                      Try Interactive Tool
                    </a>
                  }
                  className="h-10 px-4 text-xs"
                >
                  Try Interactive Tool
                </Button>
              </div>
            </div>
          ) : null}

          {/* Category Filter Badges */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight">Browse Topics</h2>
            <div className="flex flex-wrap items-center gap-2">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className="rounded-lg border bg-card px-3 py-1.5 text-xs font-medium text-foreground"
                >
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {/* Grid of Articles */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold tracking-tight">
              All Articles &amp; Playbooks ({posts.length})
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {remainingPosts.map((post) => (
                <article
                  key={post.slug}
                  className="flex flex-col justify-between rounded-xl border bg-card p-5 transition-colors hover:border-foreground/40"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                        {post.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="size-3" />
                        {post.readingTime}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold leading-snug text-foreground">
                      <a
                        href={`/blog/${post.slug}`}
                        className="hover:underline"
                        aria-label={`Read ${post.title}`}
                      >
                        {post.title}
                      </a>
                    </h3>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground line-clamp-3">
                      {post.summary}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t pt-4 text-xs">
                    <span className="text-muted-foreground font-mono text-[11px]">
                      {post.publishedAt}
                    </span>
                    <a
                      href={`/blog/${post.slug}`}
                      className="inline-flex items-center gap-1 font-medium text-foreground hover:underline"
                      aria-label={`Read ${post.title}`}
                    >
                      Read Article
                      <ArrowRight className="size-3" />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
