export function parsePageSelection(input: string, pageCount: number) {
  if (!Number.isInteger(pageCount) || pageCount < 1)
    throw new Error('Page count is unavailable.');
  if (!input.trim())
    throw new Error('Enter at least one page or range, such as 1-3, 5.');

  const pages: number[] = [];
  const seen = new Set<number>();
  for (const rawPart of input.split(',')) {
    const part = rawPart.trim();
    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!match)
      throw new Error(`“${part || rawPart}” is not a valid page or range.`);
    const start = Number(match[1]);
    const end = Number(match[2] ?? match[1]);
    if (start < 1 || end < 1 || start > pageCount || end > pageCount) {
      throw new Error(`Choose pages between 1 and ${pageCount}.`);
    }
    if (end < start)
      throw new Error(
        `Range ${part} runs backwards. Use ${end}-${start} instead.`,
      );
    if (end - start > 1999)
      throw new Error('A single range can include at most 2,000 pages.');
    for (let page = start; page <= end; page += 1) {
      if (!seen.has(page)) {
        pages.push(page);
        seen.add(page);
      }
    }
  }
  return pages;
}
