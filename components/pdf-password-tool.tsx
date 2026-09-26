'use client';

import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  FileText,
  Lock,
  RotateCcw,
  ShieldCheck,
  Unlock,
  UploadCloud,
} from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { AppShell } from '@/components/app-shell';
import { Button } from '@/components/ui/button';
import { announceCompletion } from '@/lib/completion';
import {
  decrypt,
  encrypt,
  inspect,
  PdfCryptError,
  type PdfInspection,
} from '@/lib/formats/pdfcrypt';

type Mode = 'unlock' | 'protect';

interface LoadedPdf {
  name: string;
  size: number;
  bytes: Uint8Array;
  inspection: PdfInspection;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function PdfPasswordTool() {
  const [mode, setMode] = useState<Mode>('unlock');
  const [doc, setDoc] = useState<LoadedPdf | null>(null);
  const [userPassword, setUserPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultFileName, setResultFileName] = useState<string>('');
  const [resultBytes, setResultBytes] = useState<number>(0);
  const [processingDuration, setProcessingDuration] = useState<number>(0);
  const [wasOwnerPasswordUsed, setWasOwnerPasswordUsed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setErrorMessage(null);
    setResultUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setUserPassword('');
    setOwnerPassword('');
    setConfirmPassword('');

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const inspection = await inspect(bytes);

      setDoc({
        name: file.name,
        size: file.size,
        bytes,
        inspection,
      });

      if (inspection.encrypted) {
        setMode('unlock');
      } else {
        setMode('protect');
      }
    } catch {
      setErrorMessage('Could not read or parse this PDF file.');
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        if (file && file.name.toLowerCase().endsWith('.pdf')) {
          void handleFile(file);
        } else {
          setErrorMessage('Please select a valid PDF file.');
        }
      }
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleUnlock = async () => {
    if (!doc) return;
    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const pwd = userPassword;
      setUserPassword('');

      const decrypted = await decrypt(doc.bytes, pwd);
      const elapsed = performance.now() - startTime;
      setProcessingDuration(elapsed);
      setWasOwnerPasswordUsed(decrypted.usedOwnerPassword);

      const blob = new Blob([decrypted.bytes as unknown as BlobPart], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultBytes(decrypted.bytes.length);

      const baseName = doc.name.replace(/\.pdf$/i, '');
      setResultFileName(`${baseName}-unlocked.pdf`);
    } catch (err) {
      if (err instanceof PdfCryptError) {
        if (err.code === 'WRONG_PASSWORD') {
          setErrorMessage('Incorrect password. Please verify and try again.');
        } else if (err.code === 'NOT_ENCRYPTED') {
          setErrorMessage('This PDF document is not password-protected.');
        } else if (err.code === 'UNSUPPORTED_ENCRYPTION') {
          setErrorMessage('This encryption format revision is not supported.');
        } else {
          setErrorMessage('Failed to unlock document: ' + err.code);
        }
      } else {
        setErrorMessage(
          'Failed to unlock document. Please check the password.',
        );
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleProtect = async () => {
    if (!doc) return;
    if (!userPassword) {
      setErrorMessage('Please enter a password to protect the document.');
      return;
    }
    if (userPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please retype to confirm.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    const startTime = performance.now();

    try {
      const uPwd = userPassword;
      const oPwd = ownerPassword || userPassword;
      setUserPassword('');
      setOwnerPassword('');
      setConfirmPassword('');

      const encrypted = await encrypt(doc.bytes, {
        userPassword: uPwd,
        ownerPassword: oPwd,
        permissions: -4,
      });

      const elapsed = performance.now() - startTime;
      setProcessingDuration(elapsed);

      const blob = new Blob([encrypted as unknown as BlobPart], {
        type: 'application/pdf',
      });
      const url = URL.createObjectURL(blob);
      setResultUrl(url);
      setResultBytes(encrypted.length);

      const baseName = doc.name.replace(/\.pdf$/i, '');
      setResultFileName(`${baseName}-protected.pdf`);
    } catch (err) {
      if (err instanceof PdfCryptError && err.code === 'ALREADY_ENCRYPTED') {
        setErrorMessage('This PDF is already encrypted. Unlock it first.');
      } else {
        setErrorMessage('Failed to encrypt PDF.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    announceCompletion({
      operation: mode === 'unlock' ? 'PDF Unlock' : 'PDF Protect',
      durationMs: processingDuration,
      summary:
        mode === 'unlock'
          ? `Unlocked ${doc?.name || 'document'} (${formatBytes(resultBytes)})`
          : `Protected ${doc?.name || 'document'} with AES-256 encryption`,
      metrics: [
        { label: 'File', value: resultFileName },
        { label: 'Size', value: formatBytes(resultBytes) },
        {
          label: 'Action',
          value: mode === 'unlock' ? 'Unlocked' : 'Encrypted',
        },
      ],
    });
  };

  const resetAll = () => {
    setDoc(null);
    setUserPassword('');
    setOwnerPassword('');
    setConfirmPassword('');
    setErrorMessage(null);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setResultUrl(null);
    setResultFileName('');
    setResultBytes(0);
    setProcessingDuration(0);
    setWasOwnerPasswordUsed(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <AppShell currentToolId="pdf-password" currentGroupId="pdf">
      <section
        id="tool"
        tabIndex={-1}
        className="mx-auto max-w-5xl space-y-8 px-4 py-8 focus:outline-none sm:px-6 lg:px-8"
      >
        {/* Header */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Standard Security Handler
            </span>
            <span className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              In-Browser Cryptography
            </span>
            <span className="inline-flex items-center rounded-md border border-border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              Zero Server Upload
            </span>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            PDF Password & Encryption
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground">
            Unlock password-protected PDF files or protect sensitive documents
            with industry-standard AES-256 encryption. Everything processes
            locally on your device.
          </p>
        </div>

        {/* Dropzone */}
        {!doc && (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card p-12 text-center transition-colors hover:border-foreground/30 focus-within:ring-2 focus-within:ring-ring"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  void handleFile(e.target.files[0]);
                }
              }}
            />
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-foreground">
              <UploadCloud className="h-8 w-8" />
            </div>
            <h2 className="mt-4 text-lg font-semibold text-foreground">
              Drop a PDF here or browse
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Unlock a protected document or encrypt a plain PDF
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-foreground" />
              <span>
                Passwords and files are processed strictly in your browser tab
              </span>
            </div>
          </div>
        )}

        {/* Active Workspace */}
        {doc && (
          <div className="space-y-6">
            {/* File Info Bar */}
            <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-medium text-foreground">{doc.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(doc.size)} ·{' '}
                    {doc.inspection.encrypted ? (
                      <span className="font-medium text-foreground">
                        Encrypted ({doc.inspection.algorithm || 'Standard'}) ·{' '}
                        {doc.inspection.passwordKind === 'owner-only'
                          ? 'Owner restrictions only'
                          : 'User password protected'}
                      </span>
                    ) : (
                      <span>Not encrypted</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetAll}
                  disabled={isProcessing}
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" />
                  Choose another file
                </Button>
              </div>
            </div>

            {/* Mode Selector Tabs */}
            <div className="flex rounded-lg border border-border bg-muted p-1">
              <button
                type="button"
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  mode === 'unlock'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setMode('unlock');
                  setErrorMessage(null);
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Unlock className="h-4 w-4" />
                  <span>Unlock / Decrypt</span>
                </div>
              </button>
              <button
                type="button"
                className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
                  mode === 'protect'
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setMode('protect');
                  setErrorMessage(null);
                }}
              >
                <div className="flex items-center justify-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>Protect / Encrypt</span>
                </div>
              </button>
            </div>

            {/* Mandatory Caveat Above Action */}
            <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="font-medium">
                    Unlocking needs the password. This tool cannot break or
                    recover a password it was not given, and it will not try.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    All cryptographic operations run directly in your browser
                    using client-side JavaScript. Passwords never reach
                    telemetry, an error string, the DOM after use, or a console
                    log.
                  </p>
                </div>
              </div>
            </div>

            {/* UNLOCK MODE */}
            {mode === 'unlock' && (
              <div className="rounded-xl border border-border bg-card p-6 space-y-6">
                {!doc.inspection.encrypted ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                    <p className="font-medium text-foreground">
                      This PDF is not encrypted
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      This document has no password protection or permission
                      restrictions applied. You can switch to the Protect tab to
                      set a password.
                    </p>
                  </div>
                ) : doc.inspection.passwordKind === 'owner-only' ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                      <p className="font-medium text-foreground">
                        Owner-password restrictions only
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        This PDF has an empty user password, which means it
                        opens freely in all PDF viewers without entering a
                        password. The restrictions in place only limit editing
                        or printing. You can unlock it directly with an empty
                        password to strip the restrictions entirely.
                      </p>
                    </div>
                    <Button
                      onClick={handleUnlock}
                      disabled={isProcessing}
                      className="w-full sm:w-auto"
                    >
                      <Unlock className="mr-2 h-4 w-4" />
                      {isProcessing
                        ? 'Removing Restrictions...'
                        : 'Remove Restrictions & Save'}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label
                        htmlFor="unlock-password"
                        className="block text-sm font-medium text-foreground"
                      >
                        Document Password
                      </label>
                      <input
                        id="unlock-password"
                        type="password"
                        autoComplete="off"
                        value={userPassword}
                        onChange={(e) => setUserPassword(e.target.value)}
                        placeholder="Enter the password to open this PDF"
                        className="mt-1.5 block w-full rounded-md border border-border bg-card px-3.5 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </div>
                    <Button
                      onClick={handleUnlock}
                      disabled={isProcessing || !userPassword}
                      className="w-full sm:w-auto"
                    >
                      <Unlock className="mr-2 h-4 w-4" />
                      {isProcessing ? 'Decrypting...' : 'Unlock PDF'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* PROTECT MODE */}
            {mode === 'protect' && (
              <div className="rounded-xl border border-border bg-card p-6 space-y-6">
                {doc.inspection.encrypted ? (
                  <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
                    <p className="font-medium text-foreground">
                      Document Already Protected
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      This PDF is already encrypted with{' '}
                      {doc.inspection.algorithm || 'Standard Security'}. Unlock
                      it first if you want to re-encrypt with a different
                      password.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label
                          htmlFor="protect-user-password"
                          className="block text-sm font-medium text-foreground"
                        >
                          Document Open Password
                        </label>
                        <input
                          id="protect-user-password"
                          type="password"
                          autoComplete="new-password"
                          value={userPassword}
                          onChange={(e) => setUserPassword(e.target.value)}
                          placeholder="Required to view the PDF"
                          className="mt-1.5 block w-full rounded-md border border-border bg-card px-3.5 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="protect-confirm-password"
                          className="block text-sm font-medium text-foreground"
                        >
                          Confirm Open Password
                        </label>
                        <input
                          id="protect-confirm-password"
                          type="password"
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="mt-1.5 block w-full rounded-md border border-border bg-card px-3.5 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="protect-owner-password"
                        className="block text-sm font-medium text-foreground"
                      >
                        Owner Password (Optional)
                      </label>
                      <input
                        id="protect-owner-password"
                        type="password"
                        autoComplete="new-password"
                        value={ownerPassword}
                        onChange={(e) => setOwnerPassword(e.target.value)}
                        placeholder="Leave blank to use the open password"
                        className="mt-1.5 block w-full rounded-md border border-border bg-card px-3.5 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                      <p className="mt-1 text-xs text-muted-foreground">
                        Uses AES-256 (Revision 6) encryption, the current ISO
                        32000-2 Standard security handler standard.
                      </p>
                    </div>

                    <Button
                      onClick={handleProtect}
                      disabled={
                        isProcessing || !userPassword || !confirmPassword
                      }
                      className="w-full sm:w-auto"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      {isProcessing
                        ? 'Encrypting...'
                        : 'Protect PDF with AES-256'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {errorMessage && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <p>{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Success Output Receipt */}
            {resultUrl && (
              <div className="rounded-xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-foreground">
                      {mode === 'unlock'
                        ? 'PDF Successfully Unlocked'
                        : 'PDF Successfully Encrypted'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Processed in {formatDuration(processingDuration)} · Output
                      size: {formatBytes(resultBytes)}
                      {wasOwnerPasswordUsed &&
                        ' (Unlocked with Owner Password)'}
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <a
                    href={resultUrl}
                    download={resultFileName}
                    onClick={handleDownload}
                    data-receipt-download="true"
                    className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <ArrowDownToLine className="mr-2 h-4 w-4" />
                    Download {resultFileName}
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
