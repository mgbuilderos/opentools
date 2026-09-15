/* oxlint-disable jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label, jsx-a11y/anchor-is-valid, react/no-unescaped-entities */
import { ArrowRight, Code2, Hammer, ServerOff, Video } from 'lucide-react';
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Roadmap | OpenTools',
  description: 'Local-first tools currently in development.',
};

const UPCOMING_FEATURES = [
  {
    title: 'Local Video Compressor',
    description:
      'Compress large MP4s and WebMs directly in your browser using FFmpeg.wasm without uploading gigabytes to a server.',
    icon: <Video className="size-5" />,
  },
  {
    title: 'On-Device OCR',
    description:
      'Extract text from images locally using Tesseract.js. No cloud APIs, no data leaks.',
    icon: <Code2 className="size-5" />,
  },
  {
    title: 'SQL Schema Visualizer',
    description:
      'Paste SQL tables and get an instant local ERD diagram using a client-side parser.',
    icon: <Hammer className="size-5" />,
  },
];

export default function RoadmapPage() {
  return (
    <AppShell currentToolId="">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <header className="mb-10">
          <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ServerOff className="size-4" />
            <span>Product Roadmap</span>
          </div>
          <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
            In development
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
            We are building the definitive suite of local-first developer and
            privacy tools. These are next. OpenTools is free and
            community-supported; sponsorship is optional and never required.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {UPCOMING_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="flex flex-col rounded-2xl border bg-card p-6 shadow-sm"
            >
              <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-success/10 text-success">
                {feature.icon}
              </div>
              <h2 className="text-lg font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground grow">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        <Button className="mt-8" render={<a href="/support" />}>
          Support OpenTools
          <ArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    </AppShell>
  );
}
