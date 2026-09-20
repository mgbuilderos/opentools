/* oxlint-disable */
import {
  AudioLines,
  Braces,
  BriefcaseBusiness,
  Calculator,
  CalendarDays,
  CirclePercent,
  Combine,
  Crop,
  FileCog,
  FileImage,
  FileOutput,
  FileText,
  FlaskConical,
  FileStack,
  Film,
  FlipHorizontal2,
  Globe2,
  Hash,
  Image as ImageIcon,
  Landmark,
  ListOrdered,
  FolderArchive,
  Table2,
  CalendarClock,
  FileType2,
  Megaphone,
  QrCode,
  RotateCw,
  SlidersHorizontal,
  Stamp,
  Tags,
  Trash2,
  Type,
  Wrench,
} from 'lucide-react';
import type { ToolDestination, ToolGroup } from '@/lib/tools/catalog';

// One icon per group in `toolGroups`. A missing entry renders `undefined` as a
// component and takes the whole sidebar down, so `catalog.test.ts` asserts the
// two stay in step rather than leaving it to a runtime crash.
export const groupIcons: Record<ToolGroup['id'], typeof FileStack> = {
  pdf: FileStack,
  images: ImageIcon,
  audio: AudioLines,
  video: Film,
  documents: FileType2,
  files: FolderArchive,
  'text-data': Type,
  spreadsheets: Table2,
  'developer-files': Braces,
  'web-seo': Globe2,
  calculators: Calculator,
  dates: CalendarClock,
  finance: Landmark,
  science: FlaskConical,
  'qr-barcode': QrCode,
  creator: Megaphone,
  'life-admin': BriefcaseBusiness,
};

export function destinationIcon(
  destination: ToolDestination,
  groupId: ToolGroup['id'],
) {
  const label = `${destination.id} ${destination.name}`.toLocaleLowerCase();

  if (/merge|combine|join/u.test(label)) return Combine;
  if (/extract|export/u.test(label)) return FileOutput;
  if (/image.*pdf|jpg.*pdf|png.*pdf|photo.*pdf/u.test(label)) return FileImage;
  if (/rotate/u.test(label)) return RotateCw;
  if (/reorder|sort|order/u.test(label)) return ListOrdered;
  if (/delete|remove|omit/u.test(label)) return Trash2;
  if (/watermark|stamp/u.test(label)) return Stamp;
  if (/metadata|tag/u.test(label)) return Tags;
  if (/page number|numbering|hash/u.test(label)) return Hash;
  if (/crop/u.test(label)) return Crop;
  if (/flip|mirror/u.test(label)) return FlipHorizontal2;
  if (/compress|optimize|resize|quality/u.test(label)) return SlidersHorizontal;
  if (/percentage|percent/u.test(label)) return CirclePercent;
  if (/date|time|calendar|age/u.test(label)) return CalendarDays;
  if (/settings|config|metadata/u.test(label)) return FileCog;
  if (/convert|transform|format|generator/u.test(label)) return Wrench;

  return groupIcons[groupId];
}
