/* oxlint-disable */
'use client';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Download,
  CheckCircle2,
  LockKeyhole,
  Image as ImageIcon,
} from 'lucide-react';

export function ImageUpscalerTool() {
  const [sourceUrl, setSourceUrl] = useState<string>('');
  const [resultUrl, setResultUrl] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError('Please choose an image under 10MB.');
      return;
    }

    const url = URL.createObjectURL(file);
    setSourceUrl(url);
    setResultUrl('');
    setError('');

    // Auto run the upscaler!
    await runUpscaler(url);
  };

  const runUpscaler = async (url: string) => {
    setRunning(true);
    setProgress(0);
    setError('');

    try {
      // Lazy load Upscaler to keep the main bundle light!
      const UpscalerModule = await import('upscaler');
      const Upscaler = UpscalerModule.default;

      const upscaler = new Upscaler();

      // Create an image element
      const img = new Image();
      img.src = url;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const upscaledBase64 = await upscaler.upscale(img, {
        patchSize: 64,
        padding: 2,
        progress: (amount) => {
          setProgress(Math.round(amount * 100));
        },
      });

      setResultUrl(upscaledBase64);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upscale image.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <AppShell currentToolId="image-upscaler">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-7 sm:px-8 lg:px-10 lg:py-9 focus:outline-none"
      >
        <div className="mx-auto max-w-5xl">
          <header className="flex flex-col justify-between gap-5 border-b pb-6 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Image / AI Tools
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                AI Image Upscaler
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Enhance, unblur, and upscale low-resolution photos using a
                state-of-the-art AI model running entirely in your browser.
              </p>
            </div>
            <span className="flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold">
              <LockKeyhole aria-hidden="true" className="size-3.5" />
              100% Private (No uploads)
            </span>
          </header>

          <div className="mt-6 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
            <section className="rounded-xl border bg-card p-4">
              <label className="block rounded-xl border border-dashed bg-muted/35 p-5 text-center cursor-pointer hover:bg-muted/50 transition-colors">
                <ImageIcon
                  aria-hidden="true"
                  className="mx-auto size-6 text-muted-foreground"
                />
                <span className="mt-2 block text-sm font-semibold">
                  Choose an image
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  JPEG, PNG, WebP
                </span>
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  className="hidden"
                  onChange={(e) => void handleFileChange(e)}
                />
              </label>

              {running && (
                <div className="mt-6">
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span>Upscaling...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    The first time you run this, it downloads the AI model to
                    your cache. This may take a minute!
                  </p>
                </div>
              )}

              {error && (
                <div className="mt-6 text-sm text-destructive font-semibold bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                  {error}
                </div>
              )}
            </section>

            <section className="rounded-xl border bg-card p-4 min-h-[400px] flex items-center justify-center relative overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CiAgPHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjBmMGYwIiAvPgogIDxyZWN0IHg9IjEwIiB5PSIxMCIgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjBmMGYwIiAvPgo8L3N2Zz4=')]">
              {!sourceUrl && !resultUrl && !running && (
                <div className="text-center text-muted-foreground">
                  <Sparkles className="size-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">
                    Your upscaled image will appear here
                  </p>
                </div>
              )}

              {sourceUrl && !resultUrl && (
                <img
                  src={sourceUrl}
                  className="max-w-full max-h-full object-contain opacity-50 blur-sm transition-all"
                  alt="Original"
                />
              )}

              {resultUrl && (
                <img
                  src={resultUrl}
                  className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
                  alt="Upscaled result"
                />
              )}
            </section>
          </div>

          {resultUrl && (
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = resultUrl;
                  a.download = 'upscaled-image.png';
                  a.click();
                }}
              >
                <Download className="size-4 mr-2" />
                Download Upscaled Image
              </Button>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
