/// <reference lib="webworker" />

import { maskIdentifiers } from '@/lib/tools/id-mask/mask';
import type {
  IdMaskRequest,
  IdMaskResponse,
} from '@/lib/tools/id-mask/protocol';
import { findUnmaskedIdentifiers } from '@/lib/tools/id-mask/recheck';

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.onmessage = (event: MessageEvent<IdMaskRequest>) => {
  const { id, text, panMask } = event.data;
  let response: IdMaskResponse;
  try {
    const result = maskIdentifiers(text, { panMask });
    // The re-check reads only the output, never the original text.
    const findings = findUnmaskedIdentifiers(result.output);
    response = { id, type: 'result', result, findings };
  } catch {
    response = { id, type: 'error' };
  }
  workerScope.postMessage(response);
};
