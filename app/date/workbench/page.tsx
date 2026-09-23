import type { Metadata } from 'next';

import { DateWorkbenchTool } from '@/components/date-workbench-tool';

export const revalidate = 86400;

export const metadata: Metadata = {
  alternates: { canonical: '/date/workbench' },
  title: 'Date & Time Workbench',
  description:
    'Calculate dates, workdays, time zones, durations, hours, and timesheets locally.',
};

export default function Page() {
  return <DateWorkbenchTool />;
}
