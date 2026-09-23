import { GUIDE_CONSOLIDATION } from './guide-consolidation';

/*
  Title and description for `/guides`.

  Out of the page file so that `meta-lengths.test.ts` measures the sentence the
  page actually ships. The scope wording is conditional -- after consolidation
  only some tools keep a guide, so "every" would be false -- and a conditional
  written inline in a page is a string no test can read.
*/
export function guidesIndexMeta(): { title: string; description: string } {
  const scope = GUIDE_CONSOLIDATION.enabled
    ? 'selected OpenTools utilities'
    : 'every working OpenTools utility';
  return {
    title: 'Tool Guides — every OpenTools utility, step by step',
    description: `Step-by-step guides and FAQs for ${scope}. Each tool runs in your browser tab; your files and inputs never touch a server.`,
  };
}
