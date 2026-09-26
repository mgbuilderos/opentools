/**
 * Every way an HTML document can make the browser fetch a URL its author chose.
 *
 * In an email these are not decoration. Each one is a read receipt: the sender
 * learns the message was opened, when, and the reader's IP address. A reader
 * that blocks `<img src>` and nothing else blocks the easiest vector and leaves
 * the rest, which is worse than blocking nothing, because the page then says
 * images are not loaded and the reader believes it.
 *
 * Measured against `/email/reader` on 2026-09-26, in Chromium, on the shipped
 * build. **Four fetched:** the SVG trio, and `background` on a `<td>`. An
 * earlier probe scored that last one inert because the `<td>` was not inside a
 * `<table>`, so the parser discarded it — a reminder that a vector must be
 * well-formed to be tested at all. The sanitiser inspected `src` on
 * elements whose tag name was `img`, and SVG's `<image>` is not `img` while
 * `<use>` is not an image at all — both fetch by `href`/`xlink:href`.
 *
 * The vitest suite could not have caught it. `vitest.config` sets
 * `environment: 'node'`, so `DOMParser` is undefined and the sanitiser takes
 * its regex fallback branch; the DOMParser path that actually ships was never
 * executed by a test. That is why this list lives in an end-to-end spec and not
 * a unit test.
 *
 * Add to this list rather than replacing it. A vector that is safe today is
 * safe because of a decision somebody made, and it stays here as the thing that
 * fails if the decision is reversed.
 */

/** The host no page may ever reach. Distinct enough to grep for. */
export const TRACKER_HOST = 'tracker.invalid';

export interface RemoteFetchVector {
  readonly name: string;
  readonly html: string;
  /**
   * What was observed in Chromium on 2026-09-26 against the pre-fix build.
   * `fetched` means the browser really made the request.
   */
  readonly observed: 'fetched' | 'inert';
}

export const REMOTE_FETCH_VECTORS: readonly RemoteFetchVector[] = [
  {
    name: 'svg image href',
    html: `<svg><image href="http://${TRACKER_HOST}/svgimg.png"/></svg>`,
    observed: 'fetched',
  },
  {
    name: 'svg image xlink:href',
    html: `<svg><image xlink:href="http://${TRACKER_HOST}/svgxlink.png"/></svg>`,
    observed: 'fetched',
  },
  {
    name: 'svg use href',
    html: `<svg><use href="http://${TRACKER_HOST}/svguse.svg#a"/></svg>`,
    observed: 'fetched',
  },
  {
    name: 'img src',
    html: `<img src="http://${TRACKER_HOST}/plain.png">`,
    observed: 'inert',
  },
  {
    name: 'img srcset',
    html: `<img srcset="http://${TRACKER_HOST}/srcset.png 1x">`,
    observed: 'inert',
  },
  {
    name: 'img src plus srcset',
    html: `<img src="cid:none" srcset="http://${TRACKER_HOST}/both.png 1x">`,
    observed: 'inert',
  },
  {
    name: 'protocol-relative img src',
    html: `<img src="//${TRACKER_HOST}/protorel.png">`,
    observed: 'inert',
  },
  {
    name: 'td background attribute',
    html: `<table><tr><td background="http://${TRACKER_HOST}/td.png">x</td></tr></table>`,
    observed: 'fetched',
  },
  {
    name: 'body background attribute',
    html: `<div background="http://${TRACKER_HOST}/bg.png">x</div>`,
    observed: 'inert',
  },
  {
    name: 'css background-image',
    html: `<div style="background-image:url(http://${TRACKER_HOST}/css.png)">x</div>`,
    observed: 'inert',
  },
  {
    name: 'anchor ping',
    html: `<a href="http://ok.example" ping="http://${TRACKER_HOST}/ping">x</a>`,
    observed: 'inert',
  },
  {
    name: 'object data',
    html: `<object data="http://${TRACKER_HOST}/obj.svg"></object>`,
    observed: 'inert',
  },
  {
    name: 'iframe src',
    html: `<iframe src="http://${TRACKER_HOST}/frame.html"></iframe>`,
    observed: 'inert',
  },
  {
    name: 'link stylesheet',
    html: `<link rel="stylesheet" href="http://${TRACKER_HOST}/s.css">`,
    observed: 'inert',
  },
  {
    name: 'style import',
    html: `<style>@import url("http://${TRACKER_HOST}/i.css");</style>`,
    observed: 'inert',
  },
  {
    name: 'meta refresh',
    html: `<meta http-equiv="refresh" content="0;url=http://${TRACKER_HOST}/r">`,
    observed: 'inert',
  },
  {
    name: 'video poster',
    html: `<video poster="http://${TRACKER_HOST}/poster.png"></video>`,
    observed: 'inert',
  },
  {
    name: 'input type image',
    html: `<input type="image" src="http://${TRACKER_HOST}/input.png">`,
    observed: 'inert',
  },
];

/** A single `.eml` carrying every vector at once. */
export function trackerProbeEml(subject: string): string {
  return [
    'From: sender@example.com',
    'To: reader@example.com',
    `Subject: ${subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=utf-8',
    '',
    '<html><body>',
    `<p>${subject}</p>`,
    ...REMOTE_FETCH_VECTORS.map((vector) => vector.html),
    '</body></html>',
    '',
  ].join('\r\n');
}
