import { cn } from '@/lib/utils';

export const VIDEO_TOOLS = [
  { href: '/video/trim', label: 'Trim', desc: 'Lossless trim & cut' },
  { href: '/video/convert', label: 'Convert', desc: 'MOV ↔ MP4 remux' },
  { href: '/video/rotate', label: 'Rotate', desc: '90°/180°/270° orientation' },
  { href: '/video/split', label: 'Split', desc: 'Cut into multiple clips' },
  { href: '/video/merge', label: 'Merge', desc: 'Join MP4/MOV losslessly' },
  {
    href: '/video/metadata',
    label: 'Metadata',
    desc: 'Inspect & strip EXIF/GPS',
  },
  { href: '/video/to-gif', label: 'To GIF', desc: 'Convert video to GIF' },
  {
    href: '/video/extract-audio',
    label: 'Extract Audio',
    desc: 'Lossless AAC extraction',
  },
  { href: '/video/mute', label: 'Mute', desc: 'Remove audio track' },
  { href: '/video/compress', label: 'Compress', desc: 'Reduce MP4 file size' },
  { href: '/video/resize', label: 'Resize', desc: 'Scale resolution' },
  { href: '/video/crop', label: 'Crop', desc: 'Aspect ratio & framing' },
] as const;

export function VideoSuiteNav({ currentPath }: { currentPath: string }) {
  return (
    <nav
      aria-label="Video suite tools"
      className="mt-6 flex flex-wrap items-center gap-1.5 border-b border-border/60 pb-4"
    >
      <span className="text-xs font-medium text-muted-foreground mr-2">
        Video Suite:
      </span>
      {VIDEO_TOOLS.map((tool) => {
        const isActive = currentPath === tool.href;
        return (
          <a
            key={tool.href}
            href={tool.href}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
              isActive
                ? 'bg-foreground text-background font-semibold'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            {tool.label}
          </a>
        );
      })}
    </nav>
  );
}

export function VideoRelatedLinks({ currentPath }: { currentPath: string }) {
  const others = VIDEO_TOOLS.filter((tool) => tool.href !== currentPath);
  return (
    <section
      aria-label="Related video tools"
      className="mt-12 border-t border-border pt-8"
    >
      <h2 className="text-base font-semibold tracking-[-0.02em] text-foreground mb-4">
        Related Video Tools
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {others.map((tool) => (
          <a
            key={tool.href}
            href={tool.href}
            className="rounded-lg border border-border bg-card p-3 hover:bg-muted/50 transition-colors"
          >
            <div className="font-medium text-sm text-foreground">
              {tool.label}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {tool.desc}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
