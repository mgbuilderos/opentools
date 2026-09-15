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
  Mic,
  FileAudio,
} from 'lucide-react';

export function AudioTranscribeTool() {
  const [transcript, setTranscript] = useState<string>('');
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setTranscript('');
    setError('');

    await runTranscriber(file);
  };

  const runTranscriber = async (file: File) => {
    setRunning(true);
    setProgress(0);
    setStatusText('Loading AI model...');
    setError('');

    try {
      const { pipeline, env } = await import('@xenova/transformers');
      env.allowLocalModels = false;

      const transcriber = await pipeline(
        'automatic-speech-recognition',
        'Xenova/whisper-tiny.en',
        {
          progress_callback: (data: any) => {
            if (data.status === 'progress') {
              setProgress(Math.round(data.progress));
              setStatusText(
                `Downloading model... ${Math.round(data.progress)}%`,
              );
            } else if (data.status === 'ready') {
              setStatusText('Model loaded. Transcribing...');
              setProgress(100);
            }
          },
        },
      );

      setStatusText('Decoding audio file...');
      const audioContext = new (
        window.AudioContext || (window as any).webkitAudioContext
      )({ sampleRate: 16000 });
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const audioData = audioBuffer.getChannelData(0);

      setStatusText('Transcribing audio (this may take a moment)...');

      const output = await transcriber(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      setTranscript(
        Array.isArray(output) ? output[0].text : (output as any).text,
      );
      setStatusText('');
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : 'Failed to transcribe audio.',
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <AppShell currentToolId="audio-transcriber">
      <section
        id="tool"
        tabIndex={-1}
        className="min-w-0 px-4 py-7 sm:px-8 lg:px-10 lg:py-9 focus:outline-none"
      >
        <div className="mx-auto max-w-5xl">
          <header className="flex flex-col justify-between gap-5 border-b pb-6 sm:flex-row sm:items-start">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Audio / AI Tools
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                AI Audio Transcriber
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Transcribe speech from MP3, WAV, or WebM audio files privately
                on your own device using Whisper AI.
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
                <FileAudio
                  aria-hidden="true"
                  className="mx-auto size-6 text-muted-foreground"
                />
                <span className="mt-2 block text-sm font-semibold">
                  Choose an audio file
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  MP3, WAV, OGG, WebM
                </span>
                <input
                  type="file"
                  accept="audio/*,video/webm,video/mp4"
                  className="hidden"
                  onChange={(e) => void handleFileChange(e)}
                />
              </label>

              {running && (
                <div className="mt-6">
                  <div className="flex justify-between text-xs font-semibold mb-2">
                    <span>{statusText}</span>
                  </div>
                  {progress > 0 && progress < 100 && (
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                  {progress === 100 && (
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground text-xs animate-pulse">
                      <Sparkles className="size-3" />
                      Processing audio...
                    </div>
                  )}
                </div>
              )}

              {error && (
                <div className="mt-6 text-sm text-destructive font-semibold bg-destructive/10 p-3 rounded-lg border border-destructive/20 break-words">
                  {error}
                </div>
              )}
            </section>

            <section className="rounded-xl border bg-card p-4 min-h-[400px] flex flex-col">
              {!transcript && !running && (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <Mic className="size-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">
                    Your transcription will appear here
                  </p>
                </div>
              )}

              {transcript && (
                <>
                  <div className="flex items-center justify-between mb-4 pb-3 border-b">
                    <h2 className="flex items-center gap-2 text-base font-semibold">
                      <CheckCircle2
                        aria-hidden="true"
                        className="size-5 text-success"
                      />
                      Done — Transcription
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(transcript)}
                    >
                      Copy Text
                    </Button>
                  </div>
                  <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words font-mono text-sm leading-7">
                    {transcript}
                  </pre>
                </>
              )}
            </section>
          </div>

          {transcript && (
            <div className="mt-6 flex justify-end">
              <Button
                onClick={() => {
                  const a = document.createElement('a');
                  const blob = new Blob([transcript], { type: 'text/plain' });
                  a.href = URL.createObjectURL(blob);
                  a.download = 'transcription.txt';
                  a.click();
                }}
              >
                <Download className="size-4 mr-2" />
                Download Transcription (.txt)
              </Button>
            </div>
          )}
        </div>
      </section>
    </AppShell>
  );
}
