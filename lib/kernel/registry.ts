import { KERNEL_MANIFEST } from './manifest';
import { descriptorKey } from './descriptor';
import type { KernelOperation, OperationSource } from './types';

type AdapterModule = Record<string, readonly KernelOperation[]>;
type AdapterLoader = () => Promise<AdapterModule>;

const LOADERS: Readonly<Record<string, AdapterLoader>> = {
  creator: () => import('./adapters/creator'),
  date: () => import('./adapters/date'),
  'developer-advanced': () => import('./adapters/developer-advanced'),
  'developer-data': () => import('./adapters/developer-data'),
  document: () => import('./adapters/document'),
  'file-workbench': () => import('./adapters/file'),
  'finance-business': () => import('./adapters/finance-business'),
  'life-admin': () => import('./adapters/life-admin'),
  math: () => import('./adapters/math'),
  productivity: () => import('./adapters/productivity'),
  'qr-barcode': () => import('./adapters/qr-barcode'),
  'science-education': () => import('./adapters/science-education'),
  spreadsheet: () => import('./adapters/spreadsheet'),
  subtitle: () => import('./adapters/subtitle'),
  text: () => import('./adapters/text'),
  web: () => import('./adapters/web'),
  writing: () => import('./adapters/writing'),
  'formats-email': () => import('../formats/email/kernel'),
  'formats-finance': () => import('../formats/finance/kernel'),
  'formats-pdfcrypt': () => import('../formats/pdfcrypt/kernel'),
};

const sourceCache = new Map<
  OperationSource,
  Promise<readonly KernelOperation[]>
>();

async function loadSource(
  source: OperationSource,
): Promise<readonly KernelOperation[]> {
  const existing = sourceCache.get(source);
  if (existing) return existing;
  const loader = LOADERS[source];
  if (!loader)
    throw new Error(`No kernel adapter is registered for ${source}.`);
  const loading = loader().then((module) => {
    const operations = Object.values(module).find(
      (value): value is readonly KernelOperation[] => Array.isArray(value),
    );
    if (!operations)
      throw new Error(`Kernel adapter ${source} exported no operations.`);
    return operations;
  });
  sourceCache.set(source, loading);
  return loading;
}

export const KERNEL_OPERATIONS: readonly KernelOperation[] =
  KERNEL_MANIFEST.map((descriptor) => ({
    ...descriptor,
    async run(context) {
      const operations = await loadSource(descriptor.source);
      const operation = operations.find(
        (candidate) => descriptorKey(candidate) === descriptorKey(descriptor),
      );
      if (!operation)
        throw new Error(
          `Operation ${descriptor.id} from ${descriptor.source} is missing from its adapter.`,
        );
      return operation.run(context);
    },
  }));

export function getOperation(
  id: string,
  source?: OperationSource,
): KernelOperation | undefined {
  if (source)
    return KERNEL_OPERATIONS.find(
      (operation) => operation.id === id && operation.source === source,
    );
  const matches = KERNEL_OPERATIONS.filter((operation) => operation.id === id);
  if (matches.length > 1) {
    throw new Error(
      `${id} exists in multiple sources: ${matches.map((item) => item.source).join(', ')}. Choose a source.`,
    );
  }
  return matches[0];
}
