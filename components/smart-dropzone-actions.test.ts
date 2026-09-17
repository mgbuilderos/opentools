import { describe, expect, it } from 'vitest';
import { isLiveToolUrl } from '../lib/seo/live-tools';
import { SMART_DROPZONE_ACTIONS } from './smart-dropzone-actions';

describe('smart dropzone actions', () => {
  it('asserts every dropzone action href passes isLiveToolUrl()', () => {
    const invalidActions: Array<{ type: string; label: string; href: string }> =
      [];

    for (const [type, actions] of Object.entries(SMART_DROPZONE_ACTIONS)) {
      for (const action of actions) {
        if (!isLiveToolUrl(action.href)) {
          invalidActions.push({ type, label: action.label, href: action.href });
        }
      }
    }

    expect(invalidActions).toEqual([]);
  });

  it('contains at least one primary action for every detected input type', () => {
    for (const [type, actions] of Object.entries(SMART_DROPZONE_ACTIONS)) {
      const hasPrimary = actions.some((act) => act.isPrimary);
      expect(
        hasPrimary,
        `Expected input type ${type} to have a primary action`,
      ).toBe(true);
    }
  });

  it('describes true JSON capabilities without claiming schema validation', async () => {
    const { detectInput } = await import('./smart-dropzone');
    const dummyFile = new File(['{}'], 'data.json', {
      type: 'application/json',
    });
    const fileResult = detectInput('', dummyFile);
    expect(fileResult?.details).toBe(
      'Format and check the JSON, or generate TypeScript types or a Zod schema from it.',
    );
    expect(fileResult?.details).not.toContain('validate against schema');

    const textResult = detectInput('{"foo": "bar"}');
    expect(textResult?.details).toBe(
      'Format and check the JSON, or generate TypeScript types or a Zod schema from it.',
    );
    expect(textResult?.details).not.toContain('validate against schema');
  });
});
