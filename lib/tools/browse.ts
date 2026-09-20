/**
 * The card data the home page shows for one category, split one file per
 * category so a visitor downloads the category they are looking at.
 *
 * WHY THIS FILE EXISTS. `home-workspace.tsx` called `toolSubsectionsForGroup`,
 * which lives in `catalog.ts`, which imports all eighteen workbench operation
 * modules. That made `/` a **1573 KB** page -- the most visited one on the
 * site -- to render fourteen PDF cards. Measured on the live site 2026-09-20.
 *
 * Deferring it outright was not open to us: the cards are in the prerendered
 * HTML, so the first client render has to produce the same markup or React
 * throws the page away and rebuilds it. So the default category is imported
 * statically (`INITIAL_SECTIONS`, 3.6 KB) and every other category is fetched
 * when someone actually opens it. All seventeen together are 185 KB, against
 * the ~600 KB catalogue they were being carved out of.
 *
 * KEEPING IT HONEST. `lib/tools/browse/*.ts` are generated from
 * `toolSubsectionsForGroup`, and `browse.test.ts` fails if any of them drifts
 * from what that function returns today.
 */
import type { NavGroupId } from './navigation';
import { SECTIONS as PDF_SECTIONS } from './browse/pdf';

export interface BrowseDestination {
  id: string;
  name: string;
  description: string;
  href: string;
  workspaceId: string;
}

export interface BrowseSection {
  id: string;
  title: string;
  description: string;
  destinations: readonly BrowseDestination[];
}

/** The category the home page renders before anyone has chosen one. */
export const INITIAL_GROUP_ID: NavGroupId = 'pdf';

/**
 * Statically imported, on purpose. This is the markup the prerendered HTML
 * already contains, so it has to be present at the first render rather than a
 * tick later.
 */
export const INITIAL_SECTIONS: readonly BrowseSection[] = PDF_SECTIONS;

/**
 * One literal `import()` per category, because a bundler can only split what it
 * can see. A computed path (`./browse/${id}`) would make it inline all
 * seventeen and quietly restore the problem this file exists to solve.
 */
const LOADERS: Record<
  NavGroupId,
  () => Promise<{ SECTIONS: readonly BrowseSection[] }>
> = {
  pdf: () => import('./browse/pdf'),
  images: () => import('./browse/images'),
  audio: () => import('./browse/audio'),
  video: () => import('./browse/video'),
  documents: () => import('./browse/documents'),
  files: () => import('./browse/files'),
  'text-data': () => import('./browse/text-data'),
  spreadsheets: () => import('./browse/spreadsheets'),
  'developer-files': () => import('./browse/developer-files'),
  'web-seo': () => import('./browse/web-seo'),
  calculators: () => import('./browse/calculators'),
  dates: () => import('./browse/dates'),
  finance: () => import('./browse/finance'),
  science: () => import('./browse/science'),
  'qr-barcode': () => import('./browse/qr-barcode'),
  creator: () => import('./browse/creator'),
  'life-admin': () => import('./browse/life-admin'),
};

export async function loadBrowseSections(
  groupId: NavGroupId,
): Promise<readonly BrowseSection[]> {
  if (groupId === INITIAL_GROUP_ID) return INITIAL_SECTIONS;
  return (await LOADERS[groupId]()).SECTIONS;
}
