'use client';

import {
  AlertCircle,
  ArrowDownToLine,
  CheckCircle2,
  Download,
  FileCode,
  FileText,
  Mail,
  Paperclip,
  RotateCcw,
  ShieldCheck,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  parseEmail,
  type EmailAttachment,
  type Message,
} from '@/lib/formats/email';
import { sanitizeEmailHtml } from '@/lib/tools/email/sanitize-html';

type DownloadReceipt = {
  url: string;
  name: string;
};

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB

export function EmailReaderTool() {
  const [messages, setMessages] = useState<readonly Message[]>([]);
  const [selectedMessageIndex, setSelectedMessageIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'html' | 'text'>('html');
  const [fileName, setFileName] = useState<string>('');
  const [fileBytes, setFileBytes] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<DownloadReceipt | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep track of blob URLs created for attachments to revoke on unmount/reset
  const blobUrlsRef = useRef<string[]>([]);
  const previousReceiptUrlRef = useRef<string | null>(null);

  const revokeBlobUrls = useCallback(() => {
    for (const url of blobUrlsRef.current) {
      URL.revokeObjectURL(url);
    }
    blobUrlsRef.current = [];
  }, []);

  useEffect(() => {
    if (
      previousReceiptUrlRef.current &&
      previousReceiptUrlRef.current !== receipt?.url
    ) {
      URL.revokeObjectURL(previousReceiptUrlRef.current);
    }
    previousReceiptUrlRef.current = receipt?.url ?? null;
  }, [receipt]);

  useEffect(() => {
    return () => {
      revokeBlobUrls();
      if (previousReceiptUrlRef.current) {
        URL.revokeObjectURL(previousReceiptUrlRef.current);
      }
    };
  }, [revokeBlobUrls]);

  const resetAll = useCallback(() => {
    revokeBlobUrls();
    setMessages([]);
    setSelectedMessageIndex(0);
    setViewMode('html');
    setFileName('');
    setFileBytes(0);
    setLoading(false);
    setLoadingStep('');
    setError(null);
    setReceipt(null);
  }, [revokeBlobUrls]);

  const handleFile = useCallback(
    async (file: File) => {
      resetAll();
      const lower = file.name.toLowerCase();
      const isSupported =
        lower.endsWith('.eml') ||
        lower.endsWith('.msg') ||
        lower.endsWith('.mbox') ||
        lower.endsWith('.txt');

      if (!isSupported) {
        setError('Please select a valid email file (.eml, .msg, or .mbox).');
        return;
      }
      if (file.size > MAX_BYTES) {
        setError(
          `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum supported size is 50 MB.`,
        );
        return;
      }

      setLoading(true);
      setLoadingStep('Reading email file into memory...');

      try {
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);

        setLoadingStep('Parsing email headers and MIME message structure...');
        const parsed = await parseEmail(bytes);

        if (!parsed.length) {
          setError('No readable messages were found in this file.');
          setLoading(false);
          return;
        }

        setFileName(file.name);
        setFileBytes(file.size);
        setMessages(parsed);
        setSelectedMessageIndex(0);
        // Default to HTML if available, otherwise plain text
        if (!parsed[0]?.htmlBody && parsed[0]?.textBody) {
          setViewMode('text');
        } else {
          setViewMode('html');
        }
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to parse the email message.';
        setError(message);
      } finally {
        setLoading(false);
        setLoadingStep('');
      }
    },
    [resetAll],
  );

  const currentMessage: Message | undefined = messages[selectedMessageIndex];

  // Helper to create safe object URLs for attachments
  const createAttachmentUrl = useCallback((attachment: EmailAttachment) => {
    const blob = new Blob([attachment.bytes as Uint8Array<ArrayBuffer>], {
      type: attachment.contentType || 'application/octet-stream',
    });
    const url = URL.createObjectURL(blob);
    blobUrlsRef.current.push(url);
    return url;
  }, []);

  // Sanitized HTML body
  const currentHtmlBody = currentMessage?.htmlBody;
  const currentAttachments = currentMessage?.attachments;
  const sanitizedHtml = useMemo(() => {
    if (!currentHtmlBody) return '';
    return sanitizeEmailHtml(currentHtmlBody, currentAttachments);
  }, [currentHtmlBody, currentAttachments]);

  const handleDownloadAttachment = useCallback(
    (attachment: EmailAttachment) => {
      const url = createAttachmentUrl(attachment);
      const a = document.createElement('a');
      a.href = url;
      a.download = attachment.filename || 'attachment';
      document.body.appendChild(a);
      a.click();
      a.remove();

      announceCompletion({
        operation: 'email-reader',
        durationMs: 0,
        metrics: [
          { label: 'Attachment', value: attachment.filename || 'file' },
          { label: 'Status', value: 'Complete' },
        ],
      });
    },
    [createAttachmentUrl],
  );

  const handleDownloadText = useCallback(() => {
    if (!currentMessage) return;
    const baseName = fileName.replace(/\.[^/.]+$/u, '') || 'message';
    const textContent =
      currentMessage.textBody ||
      currentMessage.htmlBody.replace(/<[^>]+>/g, ' ');
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    setReceipt({
      url,
      name: `${baseName}-body.txt`,
    });

    announceCompletion({
      operation: 'email-reader',
      durationMs: 0,
      metrics: [
        { label: 'Format', value: 'TXT' },
        { label: 'Status', value: 'Complete' },
      ],
    });
  }, [currentMessage, fileName]);

  return (
    <AppShell currentToolId="email-reader" currentGroupId="files">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-5xl space-y-8 px-4 py-8 focus:outline-none sm:px-6 lg:px-8"
      >
        {/* Header */}
        <div className="space-y-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Offline email reader
          </h1>
        </div>
        {/* Caveat & Privacy Notice */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-foreground/90">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                Private In-Browser Email Inspection
              </p>
              <p>
                Email documents (.eml, .msg, .mbox) are decoded entirely inside
                your browser. No message contents, header addresses, or
                attachments are uploaded. Remote tracking pixels and external
                images are automatically blocked so senders cannot track when or
                where you opened the message.
              </p>
              <p className="text-xs text-muted-foreground">
                Note: Interactive web forms, scripts, and embedded frames inside
                HTML messages are sanitized and neutralized for security.
              </p>
            </div>
          </div>
        </div>

        {/* Dropzone Section */}
        {messages.length === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Select Email Message File
            </h2>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) void handleFile(file);
              }}
              className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/30 bg-card p-12 text-center transition-colors hover:border-primary/50 focus-within:border-primary"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".eml,.msg,.mbox,.txt"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
                className="absolute inset-0 cursor-pointer opacity-0"
                aria-label="Choose email file"
              />
              <div className="mb-4 rounded-full bg-primary/10 p-4 text-primary">
                <Mail className="h-8 w-8" />
              </div>
              <p className="text-base font-medium text-foreground">
                Drop your EML, MSG, or mbox file here, or{' '}
                <span className="text-primary underline">browse</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Supports .eml, .msg (Outlook), and .mbox up to 50 MB. 100%
                private in-browser decoding.
              </p>
            </div>

            {loading && (
              <div className="flex items-center justify-center gap-3 rounded-lg border border-border bg-card p-4 text-sm text-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>{loadingStep || 'Decoding message...'}</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div className="space-y-1">
                  <p className="font-semibold">Unable to open email file</p>
                  <p>{error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Message Viewer */}
        {messages.length > 0 && currentMessage && (
          <div className="space-y-6">
            {/* Header / Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">
                    {fileName}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {(fileBytes / 1024).toFixed(1)} KB &bull;{' '}
                    {messages.length > 1
                      ? `${messages.length} messages in mailbox`
                      : 'Single message'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadText}
                  className="flex items-center gap-1.5"
                >
                  <Download className="h-4 w-4" />
                  <span>Save Text</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetAll}
                  className="flex items-center gap-1.5"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Choose Another File</span>
                </Button>
              </div>
            </div>

            {/* Receipt notification */}
            {receipt && (
              <div className="flex items-center justify-between gap-4 rounded-lg border border-primary/20 bg-primary/5 p-3.5">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-xs font-medium text-foreground">
                    Export ready:{' '}
                    <span className="font-semibold">{receipt.name}</span>
                  </span>
                </div>
                <a
                  href={receipt.url}
                  download={receipt.name}
                  data-receipt-download
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <ArrowDownToLine className="h-3.5 w-3.5" />
                  <span>Download</span>
                </a>
              </div>
            )}

            {/* Mailbox message switcher if multiple messages exist */}
            {messages.length > 1 && (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                <span className="text-xs font-medium text-foreground">
                  Select Message:
                </span>
                <select
                  value={selectedMessageIndex}
                  onChange={(e) =>
                    setSelectedMessageIndex(Number(e.target.value))
                  }
                  className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {messages.map((m, idx) => (
                    <option key={idx} value={idx}>
                      #{idx + 1}: {m.headers.subject || '(No subject)'} —{' '}
                      {m.headers.from || '(No sender)'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Email Header Details Card */}
            <div className="rounded-lg border border-border bg-card p-5 space-y-3">
              <h2 className="text-xl font-bold tracking-tight text-foreground">
                {currentMessage.headers.subject || '(No Subject)'}
              </h2>

              <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                <div>
                  <span className="font-semibold text-muted-foreground">
                    From:{' '}
                  </span>
                  <span className="font-mono text-foreground">
                    {currentMessage.headers.from || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">
                    Date:{' '}
                  </span>
                  <span className="text-foreground">
                    {currentMessage.headers.date || '—'}
                  </span>
                </div>
                <div>
                  <span className="font-semibold text-muted-foreground">
                    To:{' '}
                  </span>
                  <span className="font-mono text-foreground">
                    {currentMessage.headers.to || '—'}
                  </span>
                </div>
                {currentMessage.headers.cc && (
                  <div>
                    <span className="font-semibold text-muted-foreground">
                      Cc:{' '}
                    </span>
                    <span className="font-mono text-foreground">
                      {currentMessage.headers.cc}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Attachments Section if present */}
            {currentMessage.attachments.length > 0 && (
              <div className="rounded-lg border border-border bg-card p-4 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Paperclip className="h-4 w-4 text-primary" />
                  <span>Attachments ({currentMessage.attachments.length})</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentMessage.attachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-1.5 text-xs"
                    >
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {att.filename}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        ({(att.bytes.length / 1024).toFixed(1)} KB)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(att)}
                        className="ml-1 text-primary hover:underline"
                        title="Download attachment"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Body View Controls */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-2">
                  {currentMessage.htmlBody && (
                    <Button
                      variant={viewMode === 'html' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('html')}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <FileCode className="h-3.5 w-3.5" />
                      <span>Sanitized HTML</span>
                    </Button>
                  )}
                  {currentMessage.textBody && (
                    <Button
                      variant={viewMode === 'text' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setViewMode('text')}
                      className="flex items-center gap-1.5 text-xs"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      <span>Plain Text</span>
                    </Button>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground">
                  {viewMode === 'html'
                    ? 'Remote images blocked • Scripts neutralized'
                    : 'Clean text representation'}
                </span>
              </div>

              {/* Message Body Content */}
              <div className="rounded-lg border border-border bg-card p-6 min-h-[300px]">
                {viewMode === 'html' && currentMessage.htmlBody ? (
                  <div
                    className="prose prose-sm dark:prose-invert max-w-none text-foreground break-words overflow-x-auto"
                    dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap font-sans text-xs text-foreground/90 leading-relaxed break-words">
                    {currentMessage.textBody ||
                      '(No plain text body found in message)'}
                  </pre>
                )}
              </div>
            </div>
          </div>
        )}
      </section>
    </AppShell>
  );
}
