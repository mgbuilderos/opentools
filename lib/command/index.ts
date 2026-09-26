/**
 * The command bar's public entry: one call, one plan, nothing sent anywhere.
 *
 * Everything below this import is pure computation over a generated index, which
 * is why it can be promised that the sentence never leaves the tab -- not as a
 * policy, but because the page it runs on is served with `connect-src 'none'`
 * and there is no code here that would try.
 *
 * `components/command-bar.tsx` imports this module dynamically, on the first
 * keystroke, so the 1,367-tool index is fetched only by someone who is using the
 * box rather than by everyone who opens the home page.
 */
import { COMMAND_CATALOGUE } from './catalogue.generated';
import { prepare, type PreparedCatalogue } from './match';
import { planRequest, type CommandPlan, type PlanOptions } from './plan';

export type { CommandPlan, CommandPlanGap, CommandPlanStep } from './plan';
export type { SubjectKind } from './types';

/** The index, read into match shape once rather than once per sentence. */
let cached: PreparedCatalogue | undefined;

/** What this site would do about a sentence, including refusing it. */
export function plan(query: string, options: PlanOptions = {}): CommandPlan {
  cached ??= prepare(COMMAND_CATALOGUE);
  return planRequest(query, cached, options);
}
