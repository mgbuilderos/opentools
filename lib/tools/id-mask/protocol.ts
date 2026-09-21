import type { MaskResult, PanMaskStyle } from './mask';
import type { RecheckFinding } from './recheck';

export interface IdMaskRequest {
  id: number;
  text: string;
  panMask: PanMaskStyle;
}

export type IdMaskResponse =
  | {
      id: number;
      type: 'result';
      result: MaskResult;
      findings: RecheckFinding[];
    }
  | { id: number; type: 'error' };

export type { MaskResult, PanMaskStyle, RecheckFinding };
