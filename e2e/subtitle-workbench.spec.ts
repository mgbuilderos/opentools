import { readFile } from 'node:fs/promises';

import { expect, test, type Download, type Page } from '@playwright/test';

import { parseSubtitles } from '../lib/tools/subtitles/core';
import { selectOperationUntilApplied } from './hydration';

/**
 * A line that appears in this file's input and nowhere else.
 *
 * The workbench opens with its own sample already in the box and runs it 250ms
 * later, and `SAMPLE_SRT` in `lib/tools/subtitle-workbench.ts` carries the
 * *same three timings* as the SRT below — 1.000→3.400, 3.600→7.000,
 * 7.200→10.500 — with different dialogue. So every wait here that named only a
 * timestamp was already satisfied by the sample's result before this test's
 * input had been read at all, and the assertions that followed then ran
 * against three cues that happened to have the right shape: `toHaveLength(3)`
 * and a dotted timestamp both pass on the sample. Two of these tests could
 * therefore go green without their own input ever reaching the tool.
 *
 * Waiting on a line of dialogue instead closes that, because dialogue is the
 * one part of the fixture the sample does not share.
 */
const OURS = 'First line.';

const SRT = [
  '1',
  '00:00:01,000 --> 00:00:03,400',
  'First line.',
  '',
  '2',
  '00:00:03,600 --> 00:00:07,000',
  'Second line.',
  '',
  '3',
  '00:00:07,200 --> 00:00:10,500',
  '<i>Third line.</i>',
  '',
].join('\n');

/**
 * Opens the workbench on `operation`, and does not return until React has it.
 *
 * The plain `selectOption` this used to do was undone: the page is prerendered,
 * so the `<select>` exists before React attaches, and React writes the default
 * operation back over any choice made in that window. See
 * `selectOperationUntilApplied` in `./hydration` for the measurement. It also
 * doubles as this file's hydration gate — once the shell has handled a change
 * event, the `fill`s below reach React too.
 */
async function openTool(page: Page, operation: string) {
  await page.goto('/subtitles/workbench');
  await selectOperationUntilApplied(
    page,
    page.getByLabel('Subtitle tool'),
    operation,
  );
}

async function pasteSubtitles(page: Page, text: string) {
  await page.getByLabel('Or paste the subtitles here').fill(text);
}

/**
 * The workbench runs on its own as the fields change — there is no Run button —
 * so a test waits for the result to say what it is waiting for, then reads it.
 */
function outputPanel(page: Page) {
  return page.locator('section[aria-live="polite"] pre');
}

/**
 * `ours` is the part only this test's input can produce and is asserted first,
 * so a result made from the workbench's own sample can never satisfy the wait.
 * `proves` is the thing the test is actually about — the format, the new
 * timing — and is checked once the panel is known to be showing our own work.
 */
async function outputContaining(
  page: Page,
  ours: string | RegExp,
  proves?: string | RegExp,
) {
  const panel = outputPanel(page);
  await expect(panel).toContainText(ours, { timeout: 15_000 });
  if (proves !== undefined) {
    await expect(panel).toContainText(proves, { timeout: 15_000 });
  }
  return (await panel.innerText()).trim();
}

async function expectRefusal(page: Page, message: string) {
  await expect(page.getByRole('alert')).toContainText(message, {
    timeout: 15_000,
  });
  await expect(page.getByLabel('Copy result')).toHaveCount(0);
}

test.describe('Subtitle workbench', () => {
  test('converts SubRip to WebVTT and writes a file that reads back', async ({
    page,
  }) => {
    await openTool(page, 'subtitle-to-vtt');
    await pasteSubtitles(page, SRT);
    const output = await outputContaining(
      page,
      OURS,
      '00:00:01.000 --> 00:00:03.400',
    );

    expect(output.startsWith('WEBVTT')).toBe(true);
    expect(output).toContain('00:00:01.000 --> 00:00:03.400');

    const reparsed = parseSubtitles(output);
    expect(reparsed.format).toBe('vtt');
    expect(reparsed.cues).toHaveLength(3);
    expect(reparsed.warnings).toEqual([]);
  });

  test('writes SubRip with no comment line in front of it', async ({
    page,
  }) => {
    // SubRip has no comment syntax, so anything prepended would be shown by a
    // player as if it were a subtitle.
    await openTool(page, 'subtitle-shift');
    await pasteSubtitles(page, SRT);
    await page.getByLabel(/^Shift by/u).fill('2.5');
    const output = await outputContaining(
      page,
      OURS,
      '00:00:03,500 --> 00:00:05,900',
    );

    expect(output.split('\n')[0]).toBe('1');
    expect(output).not.toContain('#');
    expect(output).not.toContain('NOTE');
    expect(output).toContain('00:00:03,500 --> 00:00:05,900');
  });

  test('refuses a shift that would move subtitles before the video starts', async ({
    page,
  }) => {
    await openTool(page, 'subtitle-shift');
    await pasteSubtitles(page, SRT);
    await page.getByLabel(/^Shift by/u).fill('-5');

    await expectRefusal(
      page,
      'would move the first subtitle before the start of the video',
    );
  });

  test('stops rather than quietly dropping a block it cannot read', async ({
    page,
  }) => {
    await openTool(page, 'subtitle-to-vtt');
    await pasteSubtitles(
      page,
      `${SRT}\n4\n00:00:12,000 -> 00:00:13,000\nBad arrow.\n`,
    );

    await expectRefusal(page, 'so nothing was produced');
  });

  test('syncs to two moments so both land exactly where they were said to be', async ({
    page,
  }) => {
    await openTool(page, 'subtitle-sync');
    await pasteSubtitles(page, SRT);
    await page
      .getByLabel('True time of the FIRST subtitle')
      .fill('00:00:02,000');
    await page
      .getByLabel('True time of the LAST subtitle')
      .fill('00:00:11,000');

    const output = await outputContaining(page, OURS, '00:00:02,000 -->');
    const cues = parseSubtitles(output).cues;
    expect(cues[0].startMs).toBe(2000);
    expect(cues[cues.length - 1].startMs).toBe(11_000);
  });

  test('names the format it will save as, and saves that file', async ({
    page,
  }) => {
    await openTool(page, 'subtitle-shift');
    await pasteSubtitles(page, SRT);
    await page.getByLabel('Save the result as').selectOption('vtt');
    await outputContaining(page, OURS, 'WEBVTT');

    // The button must not promise .srt and then hand over WebVTT.
    const save = page.getByLabel('Download result as .vtt');
    await expect(save).toBeVisible();

    const download: Promise<Download> = page.waitForEvent('download');
    await save.click();
    const saved = await (await download).path();
    const text = await readFile(saved!, 'utf8');

    expect(text.startsWith('WEBVTT')).toBe(true);
    expect(parseSubtitles(text).format).toBe('vtt');
  });

  test('reads a chosen file, and a Windows-1252 one without mangling it', async ({
    page,
  }) => {
    await openTool(page, 'subtitle-to-vtt');
    // "Café — naïve" saved the way an older subtitle editor would.
    const windows1252 = Buffer.from([
      ...Buffer.from('1\n00:00:01,000 --> 00:00:02,000\nCaf', 'latin1'),
      0xe9,
      0x20,
      0x97,
      0x20,
      ...Buffer.from('na', 'latin1'),
      0xef,
      ...Buffer.from('ve', 'latin1'),
      0x0a,
    ]);

    await page
      .getByLabel('Choose a subtitle file (.srt, .vtt, .sbv, .lrc, .ass)')
      .setInputFiles({
        name: 'old-editor.srt',
        mimeType: 'text/plain',
        buffer: windows1252,
      });

    const output = await outputContaining(page, 'Café — naïve');
    expect(output).toContain('decoded as windows-1252');
    expect(output).not.toContain('Ã©');
  });

  test('checks a file and names each problem with its cue and time', async ({
    page,
  }) => {
    await openTool(page, 'subtitle-check');
    await pasteSubtitles(
      page,
      [
        '1',
        '00:00:01,000 --> 00:00:09,000',
        'Runs over the next one.',
        '',
        '2',
        '00:00:05,000 --> 00:00:05,100',
        'Gone in a flash.',
        '',
      ].join('\n'),
    );

    const output = await outputContaining(page, 'Overlaps cue 1');
    expect(output).toContain('Subtitle 2 at 00:00:05,000 — Overlaps cue 1');
    expect(output).toContain('On screen for only 100 ms');
    expect(output).toContain('at most 42 characters a line');
  });

  test('turns subtitles into a plain transcript', async ({ page }) => {
    await openTool(page, 'subtitle-to-text');
    await pasteSubtitles(page, SRT);
    const output = await outputContaining(page, 'Third line.');

    expect(output).not.toContain('-->');
    expect(output).not.toContain('<i>');
    expect(output).toContain('Third line.');
  });

  test('sends nothing off this origin while doing the work', async ({
    page,
  }) => {
    await openTool(page, 'subtitle-to-vtt');
    const origin = new URL(page.url()).origin;
    const offOrigin: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).origin !== origin) {
        offOrigin.push(request.url());
      }
    });

    await pasteSubtitles(page, SRT);
    await outputContaining(page, OURS, 'WEBVTT');
    expect(offOrigin).toEqual([]);
  });
});
