/**
 * A stand-in for `next/image`, for the same reason as `next-navigation.ts`.
 *
 * Three client components import it, and `description-coverage.test.ts` pulls
 * a page's whole component tree in as a side effect of importing the page to
 * call its real `generateMetadata`. Nothing here is ever rendered -- the test
 * reads exported metadata, not markup -- so the stub only has to exist.
 */
export default function Image(): null {
  return null;
}
