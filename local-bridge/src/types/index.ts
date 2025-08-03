export interface User {
  uid: string;
  email: string;
}

export interface ExecutionRequest {
  projectId: string;
  command: string;
  targetFiles?: string[];
  timeout?: number;
}

export interface ExecutionResult {
  executionId: string;
  status: 'success' | 'error' | 'cancelled';
  exitCode?: number;
  output: string;
  filesChanged: string[];
  duration: number;
}

export interface FileChange {
  path: string;
  action: 'created' | 'modified' | 'deleted';
  timestamp: number;
}