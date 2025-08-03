import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import admin from 'firebase-admin';

export class FileManager {
  private tempDir: string;

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
        await fs.writeFile(filePath, fileData.content || '');
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
      
      // TODO: ローカルファイルの変更を検出してFirestoreにアップロード
      // この実装は簡略化されています
      
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
      console.log(`🧹 Cleaned up working directory: ${workDir}`);
    } catch (error) {
      console.error('❌ Error cleaning up directory:', error);
    }
  }
}