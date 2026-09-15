/* oxlint-disable jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label, jsx-a11y/anchor-is-valid, react/no-unescaped-entities */
import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { ArrowRight, Video } from 'lucide-react';

export const metadata = {
  title: 'Video Compressor | OpenTools',
  description: 'Compress video locally using FFmpeg.wasm',
};

export default function VideoCompressPage() {
  return (
    <AppShell currentToolId="video-compress">
      <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-success/10 text-success mb-6">
          <Video className="size-8" />
        </div>
        <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
          Local Video Compressor
        </h1>
        <p className="mt-4 max-w-lg text-center text-muted-foreground">
          We are currently building an FFmpeg.wasm integration so you can
          compress gigabytes of video directly in your browser without uploading
          anything.
        </p>

        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm w-full max-w-md text-center">
          <h2 className="font-semibold mb-2">In development</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            This tool is not available yet. OpenTools is free and
            community-supported; sponsorship is optional and never required.
          </p>
          <Button className="w-full" render={<a href="/support" />}>
            Support OpenTools
            <ArrowRight className="ml-2 size-4" />
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
