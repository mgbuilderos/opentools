export type ToolStatus = 'public' | 'canary' | 'planned';
export type ExecutionMode = 'local-js' | 'local-wasm';

export interface ToolManifest {
  id: string;
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
    | 'Date';
  aliases: string[];
  jobs: string[];
  href: string;
  execution: {
    mode: ExecutionMode;
    capabilities: string[];
    offlineReady: boolean;
  };
  owner: string;
}
