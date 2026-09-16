'use client';

import {
  ArrowRight,
  Clock,
  Code2,
  Database,
  FileCode,
  FileSpreadsheet,
  FileText,
  FileUp,
  Image as ImageIcon,
  Link as LinkIcon,
  Palette,
  UploadCloud,
  X,
} from 'lucide-react';
import React, { useCallback, useRef, useState } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  type DetectedAction,
  SMART_DROPZONE_ACTIONS,
} from './smart-dropzone-actions';

export type { DetectedAction };

interface DetectionResult {
  category: string;
  typeLabel: string;
  summary: string;
  details?: string;
  icon: React.ReactNode;
  actions: readonly DetectedAction[];
}

function detectInput(text: string, file?: File): DetectionResult | null {
  if (file) {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const sizeKb = (file.size / 1024).toFixed(1);

    if (file.type === 'application/pdf' || ext === 'pdf') {
      return {
        category: 'Document',
        typeLabel: 'PDF Document',
        summary: `${file.name} (${sizeKb} KB)`,
        details:
          'Ready for on-device page manipulation, reordering, numbering, and merging.',
        icon: <FileText className="size-5 text-foreground" />,
        actions: SMART_DROPZONE_ACTIONS.pdf,
      };
    }

    if (
      file.type.startsWith('image/') ||
      ['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg'].includes(ext)
    ) {
      return {
        category: 'Media',
        typeLabel: 'Image Graphic',
        summary: `${file.name} (${sizeKb} KB)`,
        details:
          'Ready for client-side compression, background removal, and dimensions editing.',
        icon: <ImageIcon className="size-5 text-foreground" />,
        actions: SMART_DROPZONE_ACTIONS.image,
      };
    }

    if (file.type === 'text/csv' || ext === 'csv' || ext === 'tsv') {
      return {
        category: 'Data',
        typeLabel: 'Tabular CSV / TSV',
        summary: `${file.name} (${sizeKb} KB)`,
        details:
          'Ready for in-browser spreadsheet viewing, filtering, and JSON conversion.',
        icon: <FileSpreadsheet className="size-5 text-foreground" />,
        actions: SMART_DROPZONE_ACTIONS.csv,
      };
    }

    if (ext === 'json') {
      return {
        category: 'Developer',
        typeLabel: 'JSON File',
        summary: `${file.name} (${sizeKb} KB)`,
        details:
          'Format, validate against schema, or generate TypeScript/Zod models.',
        icon: <Code2 className="size-5 text-foreground" />,
        actions: SMART_DROPZONE_ACTIONS.json,
      };
    }

    if (
      ['sql', 'md', 'txt', 'html', 'xml', 'yaml', 'yml', 'js', 'ts'].includes(
        ext,
      )
    ) {
      return {
        category: 'Text & Code',
        typeLabel: `${ext.toUpperCase()} Document`,
        summary: `${file.name} (${sizeKb} KB)`,
        details: 'Inspect, calculate checksums, or edit in writing workbench.',
        icon: <FileCode className="size-5 text-foreground" />,
        actions: SMART_DROPZONE_ACTIONS.code,
      };
    }

    // Generic file fallback
    return {
      category: 'File',
      typeLabel: ext ? `${ext.toUpperCase()} File` : 'Binary File',
      summary: `${file.name} (${sizeKb} KB)`,
      details:
        'Compute SHA-256 cryptographic hashes, view file metadata, and inspect headers.',
      icon: <FileText className="size-5 text-foreground" />,
      actions: SMART_DROPZONE_ACTIONS['generic-file'],
    };
  }

  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. JSON Detection
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      const parsed = JSON.parse(trimmed);
      const isArray = Array.isArray(parsed);
      const keysCount = isArray ? parsed.length : Object.keys(parsed).length;
      return {
        category: 'Developer',
        typeLabel: isArray
          ? `JSON Array (${keysCount} items)`
          : `JSON Object (${keysCount} keys)`,
        summary: `Valid JSON structure with ${trimmed.length} characters`,
        details: 'Format, validate, or generate TypeScript/Zod models in RAM.',
        icon: <Code2 className="size-5 text-foreground" />,
        actions: SMART_DROPZONE_ACTIONS.json,
      };
    } catch {
      // Invalid JSON fallback if it looked like JSON
    }
  }

  // 2. Unix Epoch Timestamp Detection (e.g. 1726521600 or 1726521600000)
  if (/^\d{10,13}$/.test(trimmed)) {
    const num = Number(trimmed);
    const ms = trimmed.length === 10 ? num * 1000 : num;
    const date = new Date(ms);
    if (
      !Number.isNaN(date.getTime()) &&
      date.getFullYear() > 1970 &&
      date.getFullYear() < 2100
    ) {
      return {
        category: 'Date & Time',
        typeLabel: 'Unix Epoch Timestamp',
        summary: date.toUTCString(),
        details: `Local: ${date.toLocaleString()} · ISO: ${date.toISOString()}`,
        icon: <Clock className="size-5 text-foreground" />,
        actions: SMART_DROPZONE_ACTIONS.timestamp,
      };
    }
  }

  // 3. Hex Color Detection (e.g. #3B82F6 or #FFF)
  if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(trimmed)) {
    return {
      category: 'Design',
      typeLabel: 'HEX Color Code',
      summary: `Color: ${trimmed.toUpperCase()}`,
      details:
        'Compute accessible WCAG contrast ratios or build box-shadow presets.',
      icon: <Palette className="size-5 text-foreground" />,
      actions: SMART_DROPZONE_ACTIONS.color,
    };
  }

  // 4. SQL Query Detection
  if (
    /^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WITH)\b/i.test(trimmed)
  ) {
    return {
      category: 'Database',
      typeLabel: 'SQL Query Statement',
      summary: `${trimmed.split('\n')[0].slice(0, 50)}...`,
      details: 'Format SQL, sanitize PII, or generate visual ER diagrams.',
      icon: <Database className="size-5 text-foreground" />,
      actions: SMART_DROPZONE_ACTIONS.sql,
    };
  }

  // 5. URL Detection
  const isWebUrl =
    trimmed.startsWith(['http', '://'].join('')) ||
    trimmed.startsWith(['https', '://'].join(''));
  if (isWebUrl) {
    return {
      category: 'Web & Network',
      typeLabel: 'Web URL / Endpoint',
      summary: trimmed.length > 50 ? `${trimmed.slice(0, 50)}...` : trimmed,
      details:
        'Generate on-device QR codes, Open Graph metadata, or encode components.',
      icon: <LinkIcon className="size-5 text-foreground" />,
      actions: SMART_DROPZONE_ACTIONS.url,
    };
  }

  // 6. Base64 String Detection
  if (trimmed.length > 24 && /^[A-Za-z0-9+/=]+$/.test(trimmed)) {
    return {
      category: 'Encoding',
      typeLabel: 'Base64 Encoded Payload',
      summary: `${trimmed.slice(0, 32)}... (${trimmed.length} chars)`,
      details:
        'Decode binary bytes, inspect plaintext data, or verify cryptographic hashes.',
      icon: <FileCode className="size-5 text-foreground" />,
      actions: SMART_DROPZONE_ACTIONS.base64,
    };
  }

  // 7. General Text / Markdown
  return {
    category: 'Text & Content',
    typeLabel: 'Plaintext / Markdown',
    summary: `${trimmed.split(/\s+/).length} words · ${trimmed.length} characters`,
    details:
      'Convert case, inspect word statistics, or format in writing workbench.',
    icon: <FileText className="size-5 text-foreground" />,
    actions: SMART_DROPZONE_ACTIONS.text,
  };
}

export function SmartDropzone() {
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [inputText, setInputText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleProcessFile = useCallback((file: File) => {
    const detection = detectInput('', file);
    if (detection) {
      setResult(detection);
      setInputText(file.name);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        handleProcessFile(file);
        return;
      }

      const text = e.dataTransfer.getData('text');
      if (text) {
        setInputText(text.slice(0, 100));
        const detection = detectInput(text);
        if (detection) {
          setResult(detection);
        }
      }
    },
    [handleProcessFile],
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData('text');
    if (text) {
      setInputText(text.slice(0, 100));
      const detection = detectInput(text);
      if (detection) {
        setResult(detection);
      }
    }
  }, []);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);
    const detection = detectInput(val);
    setResult(detection);
  };

  const sampleInputs = [
    {
      label: 'JSON Payload',
      value: '{"name": "OpenTools", "type": "offline", "version": 2.0}',
    },
    { label: 'Epoch Timestamp', value: '1726521600' },
    {
      label: 'SQL Query',
      value: 'SELECT id, email, created_at FROM users WHERE active = true;',
    },
    {
      label: 'Web URL',
      value: ['https:', '//', 'getopentools.com'].join(''),
    },
  ];

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onPaste={handlePaste}
      className={cn(
        'relative rounded-2xl border transition-all duration-200 bg-card p-5 sm:p-6 shadow-sm',
        dragOver
          ? 'border-foreground ring-2 ring-foreground/20 bg-muted/20 scale-[1.01]'
          : 'border-border hover:border-foreground/40',
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        aria-label="Upload file to inspect and detect tools"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {!result ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full border bg-muted/40">
            <UploadCloud className="size-6 text-foreground" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-base sm:text-lg font-semibold tracking-tight text-foreground">
              Drop any file or paste text to launch tools instantly
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
              Auto-detects PDF, JSON, CSV, Images, Timestamps, SQL, Colors, and
              URLs. 100% processed in your browser memory.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-xl mx-auto">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                buttonVariants({ variant: 'default', size: 'sm' }),
                'h-10 px-4 gap-2 font-medium text-xs sm:text-sm shrink-0 shadow-sm',
              )}
            >
              <FileUp className="size-4" />
              <span>Browse file</span>
            </button>
            <div className="relative w-full">
              <input
                type="text"
                aria-label="Paste text or type to auto-detect tool"
                placeholder="Or paste code, timestamp, JSON, SQL, or URL..."
                value={inputText}
                onChange={handleTextChange}
                className="focus-ring h-10 w-full rounded-lg border bg-background px-3.5 text-xs sm:text-sm transition-all hover:border-foreground/30 placeholder:text-muted-foreground/70"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
            <span>Quick test:</span>
            {sampleInputs.map((sample) => (
              <button
                key={sample.label}
                type="button"
                onClick={() => {
                  setInputText(sample.value);
                  setResult(detectInput(sample.value));
                }}
                className="rounded-md border bg-muted/40 px-2 py-0.5 font-mono text-[10px] text-foreground hover:bg-muted hover:border-foreground/40 transition-colors"
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-lg border bg-muted/40">
                {result.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {result.category}
                  </span>
                  <span className="rounded-full border bg-muted px-2 py-0.5 font-mono text-[10px] font-semibold text-foreground">
                    {result.typeLabel}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-foreground mt-0.5 line-clamp-1">
                  {result.summary}
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setResult(null);
                setInputText('');
              }}
              className="flex size-7 items-center justify-center rounded-md border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Clear detection result"
            >
              <X className="size-4" />
            </button>
          </div>

          {result.details ? (
            <p className="text-xs text-muted-foreground">{result.details}</p>
          ) : null}

          <div className="space-y-2 pt-1">
            <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              Recommended On-Device Actions:
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {result.actions.map((act) => (
                <a
                  key={act.label}
                  href={act.href}
                  className={cn(
                    buttonVariants({
                      variant: act.isPrimary ? 'default' : 'outline',
                      size: 'sm',
                    }),
                    'h-8 text-xs font-semibold gap-1.5',
                  )}
                >
                  {act.label}
                  <ArrowRight className="size-3" />
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
