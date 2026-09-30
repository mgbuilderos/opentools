import { describe, expect, it } from 'vitest';

import { SMART_DROPZONE_ACTIONS } from '@/components/smart-dropzone-actions';
import { isLiveToolUrl } from '@/lib/seo/live-tool-routes';
import { SHARE_KINDS, type ShareKind } from '@/lib/share-routing';
import {
  NEXT_OPERATION_LIMIT,
  nextOperations,
} from '@/lib/tools/next-operations';

/**
 * One produced file per kind a file can be sorted into, so that every
 * assertion below runs over the whole population rather than the PDF case the
 * feature was written against.
 */
const SPECIMEN: Record<ShareKind, { name: string; type: string }> = {
  pdf: { name: 'statement.pdf', type: 'application/pdf' },
  image: { name: 'photo.png', type: 'image/png' },
  csv: { name: 'ledger.csv', type: 'text/csv' },
  json: { name: 'config.json', type: 'application/json' },
  'generic-file': { name: 'archive.bin', type: 'application/octet-stream' },
};

function route(href: string) {
  return href.split('?')[0];
}

describe('nextOperations', () => {
  it('offers only live tools, for every kind of produced file', () => {
    const dead: string[] = [];
    for (const kind of SHARE_KINDS) {
      for (const offer of nextOperations(SPECIMEN[kind], '/nowhere')) {
        if (!isLiveToolUrl(offer.href)) dead.push(`${kind}: ${offer.href}`);
      }
    }
    expect(dead).toEqual([]);
  });

  it('offers nothing it did not get from the dropzone table for that kind', () => {
    for (const kind of SHARE_KINDS) {
      const permitted = new Set(
        SMART_DROPZONE_ACTIONS[kind].map((action) => action.href),
      );
      for (const offer of nextOperations(SPECIMEN[kind], '/nowhere')) {
        expect(permitted).toContain(offer.href);
      }
    }
  });

  /**
   * The failure this guards against is the one a visitor would notice first:
   * finishing a job and being offered the tool that just ran, which does
   * nothing and reads as a bug in the receipt.
   */
  it('never offers back the tool the file came from — checked for every action of every kind', () => {
    const offered: string[] = [];
    for (const kind of SHARE_KINDS) {
      for (const action of SMART_DROPZONE_ACTIONS[kind]) {
        const offers = nextOperations(SPECIMEN[kind], action.href);
        if (offers.some((offer) => offer.href === action.href)) {
          offered.push(`${kind}: ${action.href}`);
        }
      }
    }
    expect(offered).toEqual([]);
  });

  it('keeps the other operations on the same workbench', () => {
    const offers = nextOperations(
      SPECIMEN.pdf,
      '/pdf/page-tools?tool=rotate-pdf',
    );
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.map((offer) => offer.href)).not.toContain(
      '/pdf/page-tools?tool=rotate-pdf',
    );
    // Four of the six PDF actions share this path under different `tool`
    // values; comparing paths alone would have dropped all of them.
    expect(
      offers.some((offer) => route(offer.href) === '/pdf/page-tools'),
    ).toBe(true);
  });

  it('still recognises the tool when the finished page carries other query parameters', () => {
    const offers = nextOperations(
      SPECIMEN.pdf,
      '/pdf/page-tools?tool=rotate-pdf&angle=90&from=recipe',
    );
    expect(offers.map((offer) => offer.href)).not.toContain(
      '/pdf/page-tools?tool=rotate-pdf',
    );
  });

  it('ignores a trailing slash on the finished page', () => {
    expect(
      nextOperations(SPECIMEN.image, '/image/optimize/').map((o) => o.href),
    ).not.toContain('/image/optimize');
  });

  it('sorts by extension when the MIME type says nothing — the forwarded-document case', () => {
    const vague = nextOperations(
      { name: 'invoice.pdf', type: 'application/octet-stream' },
      '/nowhere',
    );
    expect(vague).toEqual(nextOperations(SPECIMEN.pdf, '/nowhere'));
  });

  it('falls back to the generic-file tools for something it cannot place', () => {
    const offers = nextOperations(
      { name: 'unknown.qqq', type: '' },
      '/nowhere',
    );
    expect(offers.length).toBeGreaterThan(0);
    const permitted = new Set(
      SMART_DROPZONE_ACTIONS['generic-file'].map((action) => action.href),
    );
    for (const offer of offers) expect(permitted).toContain(offer.href);
  });

  it('never returns more than the limit, and returns nothing when there is no room', () => {
    for (const kind of SHARE_KINDS) {
      expect(
        nextOperations(SPECIMEN[kind], '/nowhere').length,
      ).toBeLessThanOrEqual(NEXT_OPERATION_LIMIT);
      expect(nextOperations(SPECIMEN[kind], '/nowhere', 1)).toHaveLength(1);
      expect(nextOperations(SPECIMEN[kind], '/nowhere', 0)).toEqual([]);
    }
  });

  it('gives every kind something to offer, so no finished job is a dead end', () => {
    for (const kind of SHARE_KINDS) {
      expect(nextOperations(SPECIMEN[kind], '/nowhere').length).toBeGreaterThan(
        0,
      );
    }
  });

  it('returns labels the dropzone wrote, never a synthesised one', () => {
    for (const kind of SHARE_KINDS) {
      const labels = new Map(
        SMART_DROPZONE_ACTIONS[kind].map((action) => [
          action.href,
          action.label,
        ]),
      );
      for (const offer of nextOperations(SPECIMEN[kind], '/nowhere')) {
        expect(offer.label).toBe(labels.get(offer.href));
      }
    }
  });
});
