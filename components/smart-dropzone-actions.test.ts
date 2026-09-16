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
});
