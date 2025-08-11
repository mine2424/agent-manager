import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import admin from 'firebase-admin';
import crypto from 'crypto';

interface FileInfo {
  path: string;
  content: string;
  hash: string;
  size: number;
  lastModified: number;
}

export class FileManager {
  private tempDir: string;
  private fileHashes: Map<string, string> = new Map();

  constructor() {
    // 一時ディレクトリの設定
    this.tempDir = path.join(os.tmpdir(), 'agent-manager');
  }

  async prepareWorkingDirectory(projectId: string): Promise<string> {
    const workDir = path.join(this.tempDir, projectId);
    
    // ディレクトリが存在しない場合は作成
    await fs.mkdir(workDir, { recursive: true });
    
    console.log(`📁 Prepared working directory: ${workDir}`);
    return workDir;
  }

  async downloadProjectFiles(projectId: string): Promise<void> {
    console.log(`📥 Downloading files for project: ${projectId}`);
    
    try {
      const workDir = await this.prepareWorkingDirectory(projectId);
      
      // Firestoreからファイル情報を取得
      const db = admin.firestore();
      const filesSnapshot = await db
        .collection('projects')
        .doc(projectId)
        .collection('files')
        .where('isDirectory', '==', false)
        .get();

      // 各ファイルをローカルに保存
      for (const doc of filesSnapshot.docs) {
        const fileData = doc.data();
        const filePath = path.join(workDir, fileData.path);
        
        // ディレクトリが存在しない場合は作成
        const fileDir = path.dirname(filePath);
        await fs.mkdir(fileDir, { recursive: true });
        
        // ファイルを書き込み
        const content = fileData.content || '';
        await fs.writeFile(filePath, content);
        
        // ハッシュを記録
        const hash = this.calculateHash(content);
        this.fileHashes.set(fileData.path, hash);
        
        console.log(`✅ Downloaded: ${fileData.path}`);
      }
      
      console.log(`📥 Downloaded ${filesSnapshot.size} files`);
    } catch (error) {
      console.error('❌ Error downloading files:', error);
      throw error;
    }
  }

  async uploadProjectFiles(projectId: string): Promise<string[]> {
    console.log(`📤 Uploading files for project: ${projectId}`);
    
    try {
      const workDir = path.join(this.tempDir, projectId);
      const changes: string[] = [];
      const db = admin.firestore();
      const batch = db.batch();
      
      // ディレクトリ内のすべてのファイルを再帰的に取得
      const allFiles = await this.getAllFiles(workDir);
      
      for (const filePath of allFiles) {
        const relativePath = path.relative(workDir, filePath);
        const normalizedPath = relativePath.replace(/\\/g, '/'); // Windows対応
        
        // ファイルの内容を読み込み
        const content = await fs.readFile(filePath, 'utf-8');
        const newHash = this.calculateHash(content);
        const oldHash = this.fileHashes.get(normalizedPath);
        
        // ハッシュが異なる場合は変更があったとみなす
        if (oldHash !== newHash) {
          changes.push(normalizedPath);
          
          // Firestoreのファイルドキュメントを更新
          const fileRef = db.collection('projects').doc(projectId)
            .collection('files').doc(this.sanitizeDocId(normalizedPath));
          
          batch.update(fileRef, {
            content,
            size: content.length,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            hash: newHash
          });
          
          // 新しいハッシュを記録
          this.fileHashes.set(normalizedPath, newHash);
          console.log(`📝 Changed: ${normalizedPath}`);
        }
      }
      
      // バッチ更新を実行
      if (changes.length > 0) {
        await batch.commit();
      }
      
      console.log(`📤 Uploaded ${changes.length} files`);
      return changes;
    } catch (error) {
      console.error('❌ Error uploading files:', error);
      throw error;
    }
  }

  async cleanupWorkingDirectory(projectId: string): Promise<void> {
    const workDir = path.join(this.tempDir, projectId);
    
    try {
      await fs.rm(workDir, { recursive: true, force: true });
      this.fileHashes.clear();
      console.log(`🧹 Cleaned up working directory: ${workDir}`);
    } catch (error) {
      console.error('❌ Error cleaning up directory:', error);
    }
  }

  async detectChangedFiles(projectId: string): Promise<FileInfo[]> {
    const workDir = path.join(this.tempDir, projectId);
    const changedFiles: FileInfo[] = [];
    
    try {
      const allFiles = await this.getAllFiles(workDir);
      
      for (const filePath of allFiles) {
        const relativePath = path.relative(workDir, filePath);
        const normalizedPath = relativePath.replace(/\\/g, '/');
        
        const stats = await fs.stat(filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        const newHash = this.calculateHash(content);
        const oldHash = this.fileHashes.get(normalizedPath);
        
        if (oldHash !== newHash) {
          changedFiles.push({
            path: normalizedPath,
            content,
            hash: newHash,
            size: stats.size,
            lastModified: stats.mtime.getTime()
          });
        }
      }
      
      return changedFiles;
    } catch (error) {
      console.error('❌ Error detecting changes:', error);
      throw error;
    }
  }

  private calculateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private async getAllFiles(dir: string): Promise<string[]> {
    const files: string[] = [];
    
    async function walk(currentDir: string) {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          // .gitや node_modules などは除外
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await walk(fullPath);
          }
        } else {
          files.push(fullPath);
        }
      }
    }
    
    await walk(dir);
    return files;
  }

  private sanitizeDocId(filePath: string): string {
    // Firestoreのドキュメントに使えない文字を置換
    return filePath.replace(/[\/#]/g, '__');
  }
}