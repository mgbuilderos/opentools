'use client';

import {
  AlertCircle,
  AudioWaveform,
  CheckCircle2,
  Download,
  FileAudio,
  LockKeyhole,
  RefreshCw,
  Upload,
  XCircle,
} from 'lucide-react';
import { useCallback, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { RelatedTools } from '@/components/related-tools';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import type { RelatedTool } from '@/lib/seo/related-tools';
import { decodeAudioFile } from '@/lib/tools/audio/decode';
import {
  evaluateStandards,
  measureLoudness,
  type LoudnessMetrics,
  type StandardEvaluation,
} from '@/lib/tools/audio/loudness';

interface AudioLoudnessToolProps {
  relatedTools?: readonly RelatedTool[];
}

export function AudioLoudnessTool({
  relatedTools = [],
}: AudioLoudnessToolProps) {
  const [file, setFile] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<LoudnessMetrics | null>(null);
  const [evaluations, setEvaluations] = useState<StandardEvaluation[] | null>(
    null,
  );

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (!selected) return;

      setError(null);
      setMetrics(null);
      setEvaluations(null);
      setLoading(true);
      setFile({ name: selected.name });

      try {
        const decoded = await decodeAudioFile(selected);
        const measured = measureLoudness(decoded.audio);
        const evals = evaluateStandards(measured);

        setMetrics(measured);
        setEvaluations(evals);

        announceCompletion({
          operation: 'Audio Loudness and Delivery Check',
          durationMs: 250,
          summary: `Measured ${measured.integratedLufs} LUFS, ${measured.truePeakDb} dBTP on ${selected.name}.`,
          metrics: [
            { label: 'Integrated LUFS', value: `${measured.integratedLufs}` },
            { label: 'True Peak', value: `${measured.truePeakDb} dBTP` },
            { label: 'Noise Floor', value: `${measured.noiseFloorDbfs} dBFS` },
          ],
        });
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to decode or measure audio file',
        );
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleExportJson = useCallback(() => {
    if (!metrics) return;
    const data = {
      filename: file?.name,
      metrics,
      evaluations,
      timestamp: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${file?.name?.replace(/\.[^.]+$/, '') ?? 'audio'}-loudness-report.json`;
    a.setAttribute('data-receipt-download', 'true');
    a.click();
    URL.revokeObjectURL(url);
  }, [file, metrics, evaluations]);

  return (
    <AppShell currentToolId="audio-loudness" currentGroupId="audio">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8"
      >
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">
                <AudioWaveform className="h-3.5 w-3.5" />
                ITU-R BS.1770-4 &amp; Broadcast Mastering
              </span>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                Audio Loudness and Delivery Check
              </h1>
              <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">
                Measure integrated LUFS, true peak (dBTP), loudness range (LRA),
                and noise floor according to ITU-R BS.1770-4. Verify ACX
                audiobook rejection limits, Spotify (−14 LUFS), Apple Music (−16
                LUFS), and EBU R128 (−23 LUFS). This measures directly in your
                browser.
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
            <LockKeyhole className="h-3.5 w-3.5 text-success" />
            <span>
              <strong>100% Client-Side Privacy:</strong> Audio decoding and
              K-weighting filter calculations happen entirely on your computer.
            </span>
          </div>
        </div>

        {/* Upload Zone */}
        {!file && (
          <div className="rounded-xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <Upload className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="mt-4 text-base font-semibold text-foreground">
              Select or Drop Audio Track
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports WAV, MP3, AIFF, AAC, and FLAC mastering files.
            </p>
            <div className="mt-6 flex justify-center">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                  <FileAudio className="h-4 w-4" />
                  Select Audio File
                </span>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="rounded-xl border border-border bg-card p-12 text-center">
            <RefreshCw className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm font-medium text-foreground">
              Running ITU-R BS.1770-4 K-weighting &amp; true peak analysis...
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mt-6 rounded-lg border border-border bg-muted p-4 text-sm text-foreground">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span>Analysis Error</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{error}</p>
          </div>
        )}

        {/* Results view */}
        {metrics && evaluations && (
          <div className="space-y-8">
            {/* File Overview and Export */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  File Analyzed
                </span>
                <p className="text-base font-medium text-foreground">
                  {file?.name}
                </p>
              </div>
              <Button
                data-receipt-download
                onClick={handleExportJson}
                className="inline-flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export Loudness Report (JSON)
              </Button>
            </div>

            {/* Primary Metrics Strip */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Integrated Loudness
                </span>
                <p className="mt-1 text-2xl font-bold font-mono text-foreground">
                  {metrics.integratedLufs}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    LUFS
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  ITU-R BS.1770-4 gated
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Max True Peak
                </span>
                <p className="mt-1 text-2xl font-bold font-mono text-foreground">
                  {metrics.truePeakDb}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    dBTP
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Sample peak: {metrics.samplePeakDbfs} dBFS
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Loudness Range (LRA)
                </span>
                <p className="mt-1 text-2xl font-bold font-mono text-foreground">
                  {metrics.loudnessRangeLu}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    LU
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  EBU Tech 3342 dynamic range
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Noise Floor (RMS)
                </span>
                <p className="mt-1 text-2xl font-bold font-mono text-foreground">
                  {metrics.noiseFloorDbfs}{' '}
                  <span className="text-sm font-normal text-muted-foreground">
                    dBFS
                  </span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  100ms background quietest
                </p>
              </div>
            </div>

            {/* Target Standards Compliance Grid */}
            <div className="rounded-xl border border-border bg-card">
              <div className="border-b border-border bg-muted/30 px-6 py-4">
                <h3 className="text-sm font-semibold text-foreground">
                  Platform Delivery Standards &amp; Ingestion Targets
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Objective pass / fail checks against official technical
                  delivery guidelines.
                </p>
              </div>

              <div className="divide-y divide-border">
                {evaluations.map((ev) => (
                  <div
                    key={ev.standard.id}
                    className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {ev.overallPass ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="font-semibold text-sm text-foreground">
                          {ev.standard.name}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                            ev.overallPass
                              ? 'bg-success/10 text-success'
                              : 'bg-destructive/10 text-destructive'
                          }`}
                        >
                          {ev.overallPass ? 'COMPLIANT' : 'NON-COMPLIANT'}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Target: {ev.standard.targetLufs} LUFS | Max Peak:{' '}
                        {ev.standard.maxTruePeakDb} dBTP
                        {ev.standard.maxNoiseFloorDb !== undefined
                          ? ` | Max Noise: ${ev.standard.maxNoiseFloorDb} dBFS`
                          : ''}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {ev.standard.notes}
                      </p>
                    </div>

                    <div className="text-right text-xs">
                      <span className="font-mono text-muted-foreground">
                        {ev.summary}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {relatedTools.length > 0 && (
          <div className="mt-12 border-t border-border pt-8">
            <RelatedTools tools={relatedTools} />
          </div>
        )}
      </section>
    </AppShell>
  );
}
