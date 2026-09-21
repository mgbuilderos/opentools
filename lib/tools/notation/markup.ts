function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;')
    .replace(/'/gu, '&#39;');
}

function decodeEntities(value: string): string {
  return value.replace(
    /&(amp|lt|gt|quot|apos|#39|#\d+|#x[0-9a-f]+);/giu,
    (entity, body: string) => {
      const named: Record<string, string> = {
        amp: '&',
        lt: '<',
        gt: '>',
        quot: '"',
        apos: "'",
        '#39': "'",
      };
      if (named[body.toLocaleLowerCase()] !== undefined)
        return named[body.toLocaleLowerCase()];
      const point = body.toLocaleLowerCase().startsWith('#x')
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isSafeInteger(point) &&
        point <= 0x10ffff &&
        !(point >= 0xd800 && point <= 0xdfff)
        ? String.fromCodePoint(point)
        : entity;
    },
  );
}

function inlineMarkdown(value: string): string {
  let output = escapeHtml(value);
  output = output.replace(/`([^`\n]+)`/gu, '<code>$1</code>');
  output = output.replace(/\*\*([^*\n]+)\*\*/gu, '<strong>$1</strong>');
  output = output.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/gu, '<em>$1</em>');
  output = output.replace(
    /\[([^\]\n]+)\]\(([^)\s]+)\)/gu,
    (_, label: string, rawUrl: string) => {
      let parsed: URL;
      try {
        parsed = new URL(rawUrl);
      } catch {
        return `${label} (${rawUrl})`;
      }
      return ['http:', 'https:', 'mailto:'].includes(parsed.protocol)
        ? `<a href="${escapeHtml(parsed.href)}">${label}</a>`
        : `${label} (${rawUrl})`;
    },
  );
  return output;
}

export function markdownToHtml(value: string): string {
  if (!value || !value.trim()) {
    throw new Error('Markdown is required.');
  }
  const lines = value.replace(/\r\n?/gu, '\n').split('\n');
  const output: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let code = false;
  const closeList = () => {
    if (list) output.push(`</${list}>`);
    list = null;
  };
  for (const line of lines) {
    if (line.startsWith('```')) {
      closeList();
      code = !code;
      output.push(code ? '<pre><code>' : '</code></pre>');
      continue;
    }
    if (code) {
      output.push(`${escapeHtml(line)}\n`);
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/u.exec(line);
    const unordered = /^[-*]\s+(.+)$/u.exec(line);
    const ordered = /^\d+[.)]\s+(.+)$/u.exec(line);
    if (heading) {
      closeList();
      output.push(
        `<h${heading[1].length}>${inlineMarkdown(heading[2])}</h${heading[1].length}>`,
      );
    } else if (unordered) {
      if (list !== 'ul') {
        closeList();
        list = 'ul';
        output.push('<ul>');
      }
      output.push(`<li>${inlineMarkdown(unordered[1])}</li>`);
    } else if (ordered) {
      if (list !== 'ol') {
        closeList();
        list = 'ol';
        output.push('<ol>');
      }
      output.push(`<li>${inlineMarkdown(ordered[1])}</li>`);
    } else if (!line.trim()) closeList();
    else {
      closeList();
      output.push(`<p>${inlineMarkdown(line)}</p>`);
    }
  }
  closeList();
  if (code) output.push('</code></pre>');
  return output.join('\n');
}

export function htmlToMarkdown(value: string): string {
  if (!value || !value.trim()) {
    throw new Error('HTML is required.');
  }
  let output = value.replace(
    /<\s*(script|style)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/giu,
    '',
  );
  output = output
    .replace(/<\s*br\s*\/?\s*>/giu, '\n')
    .replace(/<\s*hr\s*\/?\s*>/giu, '\n---\n');
  output = output.replace(
    /<\s*h([1-6])\b[^>]*>([\s\S]*?)<\s*\/\s*h\1\s*>/giu,
    (_, level: string, content: string) =>
      `\n${'#'.repeat(Number(level))} ${content}\n`,
  );
  output = output
    .replace(/<\s*(strong|b)\b[^>]*>([\s\S]*?)<\s*\/\s*\1\s*>/giu, '**$2**')
    .replace(/<\s*(em|i)\b[^>]*>([\s\S]*?)<\s*\/\s*\1\s*>/giu, '*$2*');
  output = output.replace(
    /<\s*code\b[^>]*>([\s\S]*?)<\s*\/\s*code\s*>/giu,
    '`$1`',
  );
  output = output.replace(
    /<\s*a\b[^>]*href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))[^>]*>([\s\S]*?)<\s*\/\s*a\s*>/giu,
    (_, double: string, single: string, bare: string, label: string) =>
      `[${label}](${double ?? single ?? bare})`,
  );
  output = output
    .replace(/<\s*li\b[^>]*>([\s\S]*?)<\s*\/\s*li\s*>/giu, '\n- $1')
    .replace(/<\s*\/?\s*(?:ul|ol)\b[^>]*>/giu, '\n');
  output = output.replace(
    /<\s*\/?\s*(?:p|div|section|article|header|footer|blockquote)\b[^>]*>/giu,
    '\n\n',
  );
  output = output.replace(/<[^>]*>/gu, '');
  return decodeEntities(output)
    .replace(/[ \t]+\n/gu, '\n')
    .replace(/\n{3,}/gu, '\n\n')
    .trim();
}
