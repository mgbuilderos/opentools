import { describe, expect, it } from 'vitest';
import { deserialisePipeline } from '../pipeline/serialise';
import { validate } from '../pipeline/validate';
import { COMMAND_CATALOGUE } from './catalogue.generated';
import { plan } from '.';

const live = new Set(
  COMMAND_CATALOGUE.map((entry) => entry.href.split('?')[0]),
);

function pipelineFrom(href: string) {
  const json = new URLSearchParams(href.split('?')[1]).get('pipeline');
  if (!json) throw new Error(`no pipeline in ${href}`);
  return deserialisePipeline(json);
}

describe('planning a typed request', () => {
  /** The sentence on the home page, which is where this all started. */
  it('answers the example in the box', () => {
    const answer = plan('make this under 2MB and strip my name out of it', {
      subject: 'pdf',
    });
    expect(answer.steps.map((step) => step.href)).toEqual([
      '/pdf/compress',
      '/pdf/metadata',
    ]);
    expect(answer.gaps).toEqual([]);
    expect(answer.steps[0]?.notes.join(' ')).toContain('2 MB');
  });

  it('says what each step answers, in the words that were typed', () => {
    const answer = plan('compress this pdf and rotate it', { subject: 'pdf' });
    expect(answer.steps.map((step) => step.clause)).toEqual([
      'compress this pdf',
      'rotate it',
    ]);
  });

  it('carries the subject from one clause to the next', () => {
    const answer = plan('deduplicate this csv then sort it');
    expect(answer.steps[1]?.href).toBe('/data/csv-sorter');
  });

  it('never points at an address that is not a live tool', () => {
    for (const query of [
      'compress this pdf and strip the metadata',
      'convert png to webp',
      'unlock this pdf',
      'write me a readme',
      'zip these up',
    ]) {
      for (const step of plan(query).steps) {
        expect(
          live.has(step.href.split('?')[0]!),
          `${query} -> ${step.href}`,
        ).toBe(true);
      }
    }
  });

  /**
   * THE TEST THAT MAKES THE CHAIN REAL.
   *
   * The command bar builds the pipeline out of the four fields its index carries,
   * without loading the kernel. This runs what it builds through the code the
   * batch runner really uses -- `deserialisePipeline`, which resolves every step
   * against the kernel manifest, and `validate`, which is what decides whether one
   * step can feed the next. A chain that this pair rejects is a button that would
   * fail after the click.
   */
  it('builds a chain the batch runner accepts', () => {
    const answer = plan('deduplicate this csv then sort the lines');
    expect(answer.chain?.steps).toBe(2);
    const pipeline = pipelineFrom(answer.chain!.href);
    expect(validate(pipeline)).toEqual([]);
    expect(pipeline.steps.map((step) => step.op)).toEqual([
      'csv-deduplicator',
      'line-sorter',
    ]);
  });

  /** An operation with no page of its own is handed over as a pipeline of one. */
  it('reaches an operation that has no page', () => {
    const [step] = plan('remove the password from this pdf', {
      subject: 'pdf',
    }).steps;
    expect(step?.name).toBe('Unlock PDF');
    const pipeline = pipelineFrom(step!.href);
    expect(validate(pipeline)).toEqual([]);
    expect(pipeline.steps).toEqual([
      { op: 'pdfcrypt-decrypt', source: 'formats-pdfcrypt', params: {} },
    ]);
  });

  /**
   * A pipeline name is in the address bar and in browser history. The steps are
   * this site's own words; the sentence is the visitor's.
   */
  it('keeps the typed sentence out of the link', () => {
    const answer = plan(
      'deduplicate this csv about margaret then sort the lines',
    );
    expect(answer.chain?.href).not.toContain('margaret');
    expect(pipelineFrom(answer.chain!.href).name).toBe(
      'CSV deduplicator, then Line sorter',
    );
  });

  /** One sentence is about one thing, so the admission belongs to the sentence. */
  it('admits to guessing the kind of file once, not once per step', () => {
    const answer = plan('make this under 2MB and strip my name out of it');
    const admissions = answer.steps.filter((step) =>
      step.notes.some((note) => note.includes('best guess')),
    );
    expect(answer.steps).toHaveLength(2);
    expect(admissions).toHaveLength(1);
  });

  it('says why steps cannot be chained, when they cannot', () => {
    const answer = plan('sort these lines and remove duplicates');
    expect(answer.chain).toBeUndefined();
    expect(answer.chainBlocked).toContain('cannot be run one after the other');
  });

  it('has nothing to say about an empty box', () => {
    for (const query of ['', '    ']) {
      expect(plan(query)).toMatchObject({ steps: [], gaps: [] });
    }
  });

  /**
   * "Help" is one word and every word of it is a stop word, so there was no
   * clause, no match, no gap -- a box that goes blank when you ask it for help.
   */
  it('still answers a sentence it found no task in', () => {
    const answer = plan('help');
    expect(answer.steps).toEqual([]);
    expect(answer.gaps).toHaveLength(1);
    expect(answer.gaps[0]?.because).toContain('Name the thing');
  });

  it('reports the words it did not recognise', () => {
    expect(plan('tell me a joke').gaps[0]?.unrecognised).toEqual(['joke']);
  });

  /**
   * The request link carries the clause and nothing else -- no file, no file name,
   * and nothing is sent by building it. GitHub shows the filled form first, and
   * the person submits it or does not.
   */
  it('offers a report that carries only the words', () => {
    const url = plan('make me a flowchart of this process').gaps[0]?.requestUrl;
    expect(url).toBeTruthy();
    const search = new URLSearchParams(url!.split('?')[1]);
    expect(search.get('template')).toBe('tool_request.yml');
    expect(search.get('task')).toBe('make me a flowchart of this process');
    expect([...search.keys()].sort()).toEqual(['task', 'template', 'title']);
  });

  it('bounds what it puts in a link', () => {
    const url = plan(`a ${'flowchart '.repeat(80)}thing`).gaps[0]?.requestUrl;
    const search = new URLSearchParams(url!.split('?')[1]);
    expect(search.get('title')!.length).toBeLessThan(90);
    expect(search.get('task')!.length).toBeLessThanOrEqual(300);
    expect(search.get('task')).not.toContain('\n');
  });

  it('counts what it searched', () => {
    expect(plan('compress this pdf').searched).toBe(COMMAND_CATALOGUE.length);
  });

  /** Nothing typed into the box can become markup, a URL, or a second request. */
  it('is unbothered by input that is trying something', () => {
    for (const query of [
      '<script>alert(1)</script>',
      '"; DROP TABLE tools; --',
      'javascript:alert(1)',
      '../../etc/passwd',
      '\u0000\u0001',
    ]) {
      const answer = plan(query);
      for (const step of answer.steps) {
        expect(step.href.startsWith('/'), query).toBe(true);
      }
      for (const gap of answer.gaps) {
        if (!gap.requestUrl) continue;
        expect(gap.requestUrl.startsWith('http'), query).toBe(true);
        expect(gap.requestUrl).not.toContain('<');
        expect(gap.requestUrl).not.toContain('\u0000');
      }
    }
  });
});
