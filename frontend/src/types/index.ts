// User types
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  githubUsername: string | null;
}

// Project types
export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string;
  githubUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// File types
export interface FileNode {
  id: string;
  name: string;
  path: string;
  content?: string;
  size: number;
  mimeType: string;
  isDirectory: boolean;
  children?: FileNode[];
  createdAt: Date;
  updatedAt: Date;
}

// Execution types
export interface Execution {
  id: string;
  projectId: string;
  command: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  output: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
  filesChanged: string[];
}