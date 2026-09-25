import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { LIVE_TOOL_ROUTES } from '../seo/live-tools';
import {
  contentSecurityPolicy,
  loadsLocalModel,
} from './content-security-policy';

/**
 * A page that names its own privacy mechanism must name the right one.
 *
 * WHY. `completion-value-dialog.tsx` is rendered by `app-shell.tsx` on every
 * tool page, and it told every reader "Your browser blocks this page from
 * uploading anything — connect-src 'none'". Four pages are not served that:
 * the image editor, the background remover and the two HEIC converters get
 * `connect-src 'self'`, so a decoder or a model can be fetched from this
 * origin. Someone finishing a HEIC conversion was shown a policy their page
 * did not have.
 *
 * The claim was not far from true -- nothing is uploaded on those pages either
 * -- and that is exactly why it needed fixing rather than excusing. The value
 * of naming a mechanism is that a reader can go and check it. A named
 * mechanism that does not match the header teaches them not to bother.
 */

const ROOT = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

const dialog = readFileSync(
  path.join(ROOT, 'components', 'completion-value-dialog.tsx'),
  'utf8',
);

describe('the privacy mechanism a page names', () => {
  it('is chosen by the same function that sets the header', () => {
    // Not by a hand-kept list of paths beside the one in
    // `content-security-policy.ts`, which is how the two would drift.
    expect(dialog).toContain('loadsLocalModel');
    expect(dialog).toContain('window.location.pathname');
  });

  it('offers exactly the two policies the server can send', () => {
    const connect = (localModel: boolean) =>
      /connect-src '([^']+)'/u.exec(contentSecurityPolicy({ localModel }))?.[1];

    // The pairing the dialog's wording depends on: a page that loads a model
    // gets 'self', every other page gets 'none'. If either side of this ever
    // changes, the sentence a reader is shown becomes wrong.
    expect(connect(false)).toBe('none');
    expect(connect(true)).toBe('self');

    expect(dialog, "the 'none' wording is gone").toContain(
      'connect-src &apos;none&apos;',
    );
    expect(dialog, "the 'self' wording is gone").toContain(
      'connect-src &apos;self&apos;',
    );
  });

  it('agrees with the header on every live tool page', () => {
    const wrong: string[] = [];
    for (const route of LIVE_TOOL_ROUTES) {
      const localModel = loadsLocalModel(route);
      const header = /connect-src '([^']+)'/u.exec(
        contentSecurityPolicy({ localModel }),
      )?.[1];
      // `sealed` in the dialog is `!loadsLocalModel(pathname)` and picks the
      // 'none' wording, so sealed must mean the header really is 'none'.
      const says = !localModel ? 'none' : 'self';
      if (says !== header) {
        wrong.push(`${route}: says '${says}', served '${header}'`);
      }
    }
    expect(wrong, wrong.join('\n')).toEqual([]);
  });

  it('never claims a sealed policy on a page that loads a model', () => {
    // The four, named, so that relaxing a fifth page's header without
    // revisiting the wording is a failing test rather than a quiet overclaim.
    const relaxed = LIVE_TOOL_ROUTES.filter((route) => loadsLocalModel(route));
    expect([...relaxed].sort()).toEqual([
      '/image/background-remover',
      '/image/editor',
      '/image/heic-to-jpg',
      '/image/heic-to-png',
    ]);
  });
});
