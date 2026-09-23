/**
 * The shape of the depth content one PDF or image tool page carries.
 *
 * Kept in its own module because `components/tool-depth-content.tsx` needs the
 * type and nothing else: importing it from `tool-page-depth.ts` would pull
 * every word of both content files into the client bundle of every tool page,
 * when the page is already handed the one entry it renders as a prop.
 */

export interface ToolPageDepthStep {
  name: string;
  text: string;
}

export interface ToolPageDepthFaq {
  question: string;
  answer: string;
}

export interface ToolPageDepthSection {
  heading: string;
  body: readonly string[];
}

export interface ToolPageDepth {
  /** `metadata.title`. The ` · OpenTools` template is appended by the layout. */
  title: string;
  /** `metadata.description`. */
  description: string;
  /** The heading the depth block is announced by, e.g. "About the PDF merger". */
  heading: string;
  /** One paragraph that answers the query on its own, for answer engines. */
  directAnswer: string;
  /** What the tool is, in a paragraph that names where it stops. */
  lead: string;
  /** The steps a reader follows. Emitted as `HowTo` structured data. */
  steps: readonly ToolPageDepthStep[];
  /** Prose sections: how it works, what it refuses, limits, privacy. */
  sections: readonly ToolPageDepthSection[];
  /** Emitted as `FAQPage` structured data. */
  faqs: readonly ToolPageDepthFaq[];
  /**
   * True only for a route in the service worker precache list. Setting it on
   * any other route fails `lib/seo/tool-page-depth.test.ts`.
   */
  offlineReady?: boolean;
}
