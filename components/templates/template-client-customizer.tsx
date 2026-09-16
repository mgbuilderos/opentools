'use client';

import { useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileText,
  Printer,
  Sparkles,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { TemplateItem } from '@/lib/templates/templates-data';

interface TemplateClientCustomizerProps {
  template: TemplateItem;
}

export function TemplateClientCustomizer({
  template,
}: TemplateClientCustomizerProps) {
  const [copied, setCopied] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (template.interactiveFields) {
      for (const field of template.interactiveFields) {
        initial[field.id] = field.defaultValue;
      }
    }
    return initial;
  });

  const getProcessedMarkdown = () => {
    let result = template.contentMarkdown;
    for (const [key, val] of Object.entries(fieldValues)) {
      result = result.replaceAll(`{{${key}}}`, val || `[${key}]`);
    }
    return result;
  };

  const currentMarkdown = getProcessedMarkdown();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentMarkdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be restricted in some environments
    }
  };

  const handleDownload = () => {
    const blob = new Blob([currentMarkdown], {
      type: 'text/markdown;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = template.downloadFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Primary Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        {template.duplicateUrl ? (
          <a
            href={template.duplicateUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Duplicate ${template.title}`}
            className={cn(
              buttonVariants({ variant: 'default', size: 'lg' }),
              'h-11 px-5 text-sm font-semibold gap-2',
            )}
          >
            {template.format === 'Notion'
              ? 'Duplicate Notion Template'
              : 'Make a Copy in Google Sheets'}
            <ExternalLink className="size-4" />
          </a>
        ) : null}

        <Button
          variant="outline"
          onClick={handleDownload}
          className="h-11 px-4 text-xs font-semibold gap-2"
        >
          <Download className="size-4" />
          Download {template.format.includes('Sheet') ? 'CSV' : 'Markdown'} (.
          {template.downloadFilename.split('.').pop()})
        </Button>

        <Button
          variant="outline"
          onClick={handleCopy}
          className="h-11 px-4 text-xs font-semibold gap-2"
        >
          {copied ? (
            <>
              <Check className="size-4 text-success" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="size-4" />
              Copy Raw Markdown
            </>
          )}
        </Button>

        {template.interactiveFields ? (
          <Button
            variant="outline"
            onClick={handlePrint}
            className="h-11 px-4 text-xs font-semibold gap-2"
          >
            <Printer className="size-4" />
            Print / Save as PDF
          </Button>
        ) : null}
      </div>

      {/* Interactive Form Fields (For Legal / Document Customizers) */}
      {template.interactiveFields ? (
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 border-b pb-3">
            <Sparkles className="size-4 text-foreground" />
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              Customize Document in Real-Time (100% On-Device)
            </h3>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {template.interactiveFields.map((field) => (
              <div key={field.id} className="space-y-1.5">
                <label
                  htmlFor={`field-${field.id}`}
                  className="block text-xs font-semibold text-muted-foreground"
                >
                  {field.label}
                </label>
                <input
                  id={`field-${field.id}`}
                  type="text"
                  value={fieldValues[field.id] || ''}
                  placeholder={field.placeholder}
                  onChange={(e) =>
                    setFieldValues((prev) => ({
                      ...prev,
                      [field.id]: e.target.value,
                    }))
                  }
                  className="focus-ring h-10 w-full rounded-lg border bg-background px-3 text-xs text-foreground transition-colors hover:border-foreground/30 focus:border-foreground/60"
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Document Live Preview Panel */}
      <div className="rounded-2xl border bg-muted/30 p-6 space-y-4">
        <div className="flex items-center justify-between border-b pb-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2 font-mono font-medium">
            <FileText className="size-4" />
            Live Preview &amp; Code Inspector
          </span>
          <span className="rounded-full border bg-background px-2.5 py-0.5 text-[11px] font-medium text-foreground">
            Zero Server Uploads
          </span>
        </div>

        <div className="max-h-[500px] overflow-y-auto rounded-xl border bg-card p-6 font-mono text-xs leading-6 text-foreground whitespace-pre-wrap select-all">
          {currentMarkdown}
        </div>
      </div>
    </div>
  );
}
