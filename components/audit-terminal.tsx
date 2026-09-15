'use client';

import { Terminal } from 'lucide-react';

export function AuditTerminal() {
  return (
    <div className="mt-4 overflow-hidden rounded-xl bg-zinc-950 p-4 font-mono text-[10px] leading-relaxed text-zinc-400 sm:text-xs">
      <div className="mb-2 flex items-center gap-2 border-b border-zinc-800 pb-2 text-zinc-500">
        <Terminal className="size-3" />
        <span>Network Audit Log</span>
      </div>
      <p>&gt; Initializing local WebAssembly worker...</p>
      <p>&gt; Loading file blobs into memory...</p>
      <p>&gt; Executing process...</p>
      <p className="mt-2 text-success">
        [SUCCESS] Zero network egress detected.
      </p>
      <p className="text-success">
        [SUCCESS] Your files never left this device.
      </p>
    </div>
  );
}
