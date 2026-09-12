export interface StandardFieldOption {
  value: string;
  label: string;
}

export interface StandardField {
  id: string;
  label: string;
  type: 'number' | 'text' | 'textarea' | 'select' | 'file';
  defaultValue: string;
  placeholder?: string;
  accept?: string;
  maxBytes?: number;
  options?: readonly StandardFieldOption[];
}

export interface StandardOperation {
  id: string;
  name: string;
  description: string;
  fields: readonly StandardField[];
  notice?: string;
  outputExtension?: string;
}

export const text = (
  id: string,
  label: string,
  defaultValue = '',
  placeholder?: string,
): StandardField => ({
  id,
  label,
  type: 'text',
  defaultValue,
  placeholder,
});

export const area = (
  id: string,
  label: string,
  defaultValue = '',
  placeholder?: string,
): StandardField => ({
  id,
  label,
  type: 'textarea',
  defaultValue,
  placeholder,
});

export const number = (
  id: string,
  label: string,
  defaultValue = '0',
  placeholder?: string,
): StandardField => ({
  id,
  label,
  type: 'number',
  defaultValue,
  placeholder,
});

export function select(
  id: string,
  label: string,
  defaultValue: string,
  options: readonly StandardFieldOption[],
): StandardField;
export function select(
  id: string,
  label: string,
  options: readonly StandardFieldOption[],
  defaultValue?: string,
): StandardField;
export function select(
  id: string,
  label: string,
  arg3: readonly StandardFieldOption[] | string,
  arg4?: readonly StandardFieldOption[] | string,
): StandardField {
  if (typeof arg3 === 'string') {
    const defaultValue = arg3;
    const options = Array.isArray(arg4) ? arg4 : [];
    return { id, label, type: 'select', defaultValue, options };
  }
  const options = arg3;
  const defaultValue =
    typeof arg4 === 'string' ? arg4 : (options[0]?.value ?? '');
  return { id, label, type: 'select', defaultValue, options };
}

export const file = (
  id: string,
  label: string,
  accept: string,
  maxBytes = 25_000_000,
): StandardField => ({
  id,
  label,
  type: 'file',
  defaultValue: '',
  accept,
  maxBytes,
});

export function raw(values: Record<string, string>, key: string): string {
  return values[key] ?? '';
}

export function required(
  values: Record<string, string>,
  key: string,
  label: string,
  maximum = 1_000_000,
): string {
  const value = raw(values, key).trim();
  if (!value) throw new Error(`Provide ${label}.`);
  if (value.length > maximum)
    throw new Error(`${label} exceeds ${maximum.toLocaleString()} characters.`);
  return value;
}

export function finite(
  values: Record<string, string>,
  key: string,
  label: string,
  minimum = Number.NEGATIVE_INFINITY,
  maximum = Number.POSITIVE_INFINITY,
): number {
  const textVal = raw(values, key).trim();
  if (!textVal) throw new Error(`Enter ${label}.`);
  const value = Number(textVal);
  if (!Number.isFinite(value))
    throw new Error(`Enter a valid number for ${label}.`);
  if (value < minimum || value > maximum)
    throw new Error(
      `${label} must stay between ${minimum.toLocaleString()} and ${maximum.toLocaleString()}.`,
    );
  return value;
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
