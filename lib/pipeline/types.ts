export interface PipelineStep {
  op: string;
  source: string;
  params: Readonly<Record<string, string>>;
}

export interface Pipeline {
  version: 1;
  name: string;
  steps: readonly PipelineStep[];
  droppedParams?: readonly string[];
}
