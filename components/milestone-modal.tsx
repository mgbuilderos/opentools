/* oxlint-disable */
'use client';

import { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from './ui/button';

export function MilestoneModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [milestone, setMilestone] = useState(0);

  useEffect(() => {
    const handleUsage = () => {
      try {
        const count = parseInt(
          localStorage.getItem('tool_usage_count') || '0',
          10,
        );
        if (count === 10 || count === 50 || count === 100) {
          // Check if we already celebrated this one
          const celebrated = JSON.parse(
            localStorage.getItem('celebrated_milestones') || '[]',
          );
          if (!celebrated.includes(count)) {
            setMilestone(count);
            setIsOpen(true);
            celebrated.push(count);
            localStorage.setItem(
              'celebrated_milestones',
              JSON.stringify(celebrated),
            );
          }
        }
      } catch (e) {}
    };

    window.addEventListener('tool-executed', handleUsage);
    return () => window.removeEventListener('tool-executed', handleUsage);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl border border-success/20 bg-card p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-success" />

        <div className="flex items-start justify-between relative z-10">
          <div className="flex items-center gap-2 text-success dark:text-success font-bold">
            <Sparkles className="size-5" />
            Milestone Unlocked!
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(false)}
            className="size-8"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="mt-6 relative z-10">
          <h2 className="text-2xl font-bold mb-2">
            You've used OpenTools {milestone} times!
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-6">
            It looks like we've become a staple in your workflow. We rely 100%
            on users like you to keep this project alive and completely free
            from tracking.
          </p>

          <a
            href="/support"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-success px-4 py-3 text-sm font-semibold text-white hover:bg-success transition-colors"
          >
            Support our development
          </a>
        </div>
      </div>
    </div>
  );
}
