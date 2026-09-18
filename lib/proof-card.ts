/**
 * The share object: a picture of the *task*, never of the user's file.
 *
 * Rule 33 forbids watermarking or branding a core output, and that is not
 * negotiable — it is the thing this product beats the incumbents on, and a law
 * firm cannot send a client a contract carrying someone else's logo. The same
 * rule leaves exactly one door open: *"any public proof card or attribution is
 * explicit and removable."* Learning 35 names what may go through it —
 * *"share the exact tool, a content-free recipe, a redacted proof card … not a
 * user artifact, filename, QR payload, secret, or private parameter."*
 *
 * So this draws a card describing what the tool did, which the user asks for
 * and may discard. It never touches the file they came for.
 *
 * `sanitiseFact` is the load-bearing part. Metrics arrive from a dozen tool
 * components, and any one of them could start passing a filename tomorrow
 * without anyone noticing — at which point this would quietly publish user
 * data to social media. It fails closed instead: anything that looks like a
 * filename, a path, an address or a secret is dropped rather than drawn.
 */

export interface ProofFact {
  label: string;
  value: string;
}

export interface ProofCardInput {
  operation: string;
  durationText: string;
  facts: ProofFact[];
}

export const PROOF_CARD_WIDTH = 1200;
export const PROOF_CARD_HEIGHT = 630;

/** Patterns that must never reach a shared image. */
const LOOKS_LIKE_USER_DATA = [
  // A filename with an extension — the single most likely leak.
  //
  // The negative lookahead matters: without it this also matches the decimal
  // in "0.82 s" and silently drops every duration and half the size figures,
  // which is what the card exists to show. An extension has to contain a
  // letter; a group of digits after a dot is a number.
  /\.(?![0-9]+\b)[a-z0-9]{2,5}\b/iu,
  /[/\\]/u, // path separators
  /@/u, // email, UPI handle
  /\b\d{1,3}(?:\.\d{1,3}){3}\b/u, // IPv4
  /[A-Za-z]:\\/u, // Windows drive
  /\b(?:sk|pk|ghp|xox|AKIA)[-_A-Za-z0-9]{8,}/u, // token shapes
  /\bhttps?\b/iu,
  /\bwww\b/iu,
];

/**
 * A fact is publishable only if it is short and matches nothing above.
 * Returns null when it must be dropped — callers omit it rather than
 * substituting a placeholder, because a placeholder invites someone to relax
 * the rule later.
 */
export function sanitiseFact(fact: ProofFact): ProofFact | null {
  const label = fact.label?.trim() ?? '';
  const value = fact.value?.trim() ?? '';
  if (!label || !value) return null;
  // Generous enough for "2.4 MB → 380 KB", far too short for a document title.
  if (label.length > 28 || value.length > 32) return null;
  for (const pattern of LOOKS_LIKE_USER_DATA) {
    if (pattern.test(label) || pattern.test(value)) return null;
  }
  return { label, value };
}

/** Every fact that may be drawn, in order, capped at three. */
export function publishableFacts(facts: ProofFact[]): ProofFact[] {
  return facts
    .map(sanitiseFact)
    .filter((fact): fact is ProofFact => fact !== null)
    .slice(0, 3);
}

/**
 * The operation name is drawn as a heading. It comes from the tool, not the
 * user, but it goes through the same check: a tool could name an operation
 * after the file it just handled.
 */
export function sanitiseOperation(operation: string): string {
  const trimmed = (operation ?? '').trim().slice(0, 44);
  if (!trimmed) return 'A task';
  for (const pattern of LOOKS_LIKE_USER_DATA) {
    if (pattern.test(trimmed)) return 'A task';
  }
  return trimmed;
}

const INK = '#f5f5f2';
const GROUND = '#0a0a0a';
const ACCENT = '#22c55e';
const MUTED = '#a8a8a2';
const PANEL = '#383834';

/**
 * Draws the card. Returns a PNG blob, or null where the browser cannot draw
 * one — the caller then simply does not offer the share action rather than
 * failing in front of the user.
 */
export async function drawProofCard(
  input: ProofCardInput,
): Promise<Blob | null> {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = PROOF_CARD_WIDTH;
  canvas.height = PROOF_CARD_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const sans =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
  const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

  context.fillStyle = GROUND;
  context.fillRect(0, 0, PROOF_CARD_WIDTH, PROOF_CARD_HEIGHT);
  context.fillStyle = ACCENT;
  context.fillRect(0, 0, 10, PROOF_CARD_HEIGHT);

  const left = 84;
  context.textBaseline = 'alphabetic';

  context.fillStyle = MUTED;
  context.font = `600 22px ${sans}`;
  context.fillText('getopentools.com', left, 104);

  context.fillStyle = INK;
  context.font = `700 62px ${sans}`;
  context.fillText(sanitiseOperation(input.operation), left, 190);

  context.fillStyle = MUTED;
  context.font = `400 30px ${sans}`;
  context.fillText('Done in the browser tab. Nothing was uploaded.', left, 244);

  // The facts, as a row of panels. No filename can reach here.
  const facts = publishableFacts(input.facts);
  const all: ProofFact[] = [
    ...facts,
    { label: 'Took', value: input.durationText },
  ].slice(0, 3);

  let x = left;
  const top = 300;
  for (const fact of all) {
    context.font = `500 20px ${sans}`;
    const labelWidth = context.measureText(fact.label).width;
    context.font = `700 40px ${mono}`;
    const valueWidth = context.measureText(fact.value).width;
    const boxWidth = Math.max(labelWidth, valueWidth) + 56;

    context.fillStyle = '#141414';
    context.strokeStyle = PANEL;
    context.lineWidth = 2;
    context.beginPath();
    context.roundRect(x, top, boxWidth, 132, 12);
    context.fill();
    context.stroke();

    context.fillStyle = MUTED;
    context.font = `500 20px ${sans}`;
    context.fillText(fact.label, x + 28, top + 46);
    context.fillStyle = INK;
    context.font = `700 40px ${mono}`;
    context.fillText(fact.value, x + 28, top + 100);

    x += boxWidth + 20;
    if (x > PROOF_CARD_WIDTH - 200) break;
  }

  // The claim, named as the mechanism so it can be checked rather than believed.
  const chipY = 496;
  context.font = `600 26px ${mono}`;
  const chipText = "connect-src 'none'";
  const chipWidth = context.measureText(chipText).width + 44;
  context.fillStyle = PANEL;
  context.beginPath();
  context.roundRect(left, chipY, chipWidth, 58, 10);
  context.fill();
  context.fillStyle = ACCENT;
  context.fillText(chipText, left + 22, chipY + 39);

  context.fillStyle = MUTED;
  context.font = `400 26px ${sans}`;
  context.fillText(
    '— the browser blocked this page from uploading',
    left + chipWidth + 20,
    chipY + 39,
  );

  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob((blob) => resolve(blob), 'image/png'),
  );
}
