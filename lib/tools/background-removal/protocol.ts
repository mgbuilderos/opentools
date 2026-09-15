export type BackgroundRemovalRequest = { type: 'remove'; image: Blob };

export type BackgroundRemovalResponse =
  | { type: 'done'; image: Blob; foregroundRatio: number }
  | { type: 'error'; message: string };
