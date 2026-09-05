export type TextCaseMode =
  | 'sentence'
  | 'title'
  | 'upper'
  | 'lower'
  | 'trim-lines';

export const textCaseOptions: Array<{ id: TextCaseMode; label: string }> = [
  { id: 'sentence', label: 'Sentence case' },
  { id: 'title', label: 'Title Case' },
  { id: 'upper', label: 'UPPERCASE' },
  { id: 'lower', label: 'lowercase' },
  { id: 'trim-lines', label: 'Trim lines' },
];

export function transformText(value: string, mode: TextCaseMode): string {
  switch (mode) {
    case 'upper':
      return value.toLocaleUpperCase();
    case 'lower':
      return value.toLocaleLowerCase();
    case 'title':
      return value
        .toLocaleLowerCase()
        .replace(
          /(^|[^\p{L}\p{N}])([\p{L}])/gu,
          (_, boundary, letter) => `${boundary}${letter.toLocaleUpperCase()}`,
        );
    case 'trim-lines':
      return value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .join('\n');
    case 'sentence':
      return value
        .toLocaleLowerCase()
        .replace(
          /(^\s*|[.!?]\s+)([\p{L}])/gu,
          (_, boundary, letter) => `${boundary}${letter.toLocaleUpperCase()}`,
        );
  }
}

export function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/u).length : 0;
}
