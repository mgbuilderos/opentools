import type { Metadata } from 'next';

import { DateWorkbenchTool } from '@/components/date-workbench-tool';

export const metadata: Metadata = {
  title: 'Date & Time Workbench',
  description:
    'Calculate dates, workdays, time zones, durations, hours, and timesheets locally.',
};

export default function Page() {
  return <DateWorkbenchTool />;
}
