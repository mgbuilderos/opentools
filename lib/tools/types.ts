export type ToolStatus = 'public' | 'canary' | 'planned';
export type ExecutionMode = 'local-js' | 'local-wasm';

export interface ToolManifest {
  id: string;
  resultId?: string;
  version: string;
  status: ToolStatus;
  name: string;
  shortDescription: string;
  category:
    | 'Text'
    | 'PDF'
    | 'Data'
    | 'Image'
    | 'Developer'
    | 'File'
    | 'Math'
    | 'Date'
    | 'Web'
    | 'Creator'
    | 'Document'
    | 'Science'
    | 'Finance'
    | 'Life Admin';
  aliases: string[];
  jobs: string[];
  searchEntries?: Array<{
    id: string;
    name: string;
    description: string;
    href: string;
  }>;
  href: string;
  execution: {
    mode: ExecutionMode;
    capabilities: string[];
    offlineReady: boolean;
  };
  owner: string;
}
