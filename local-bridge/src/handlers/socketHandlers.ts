import { Server as SocketIOServer, Socket } from 'socket.io';
import { ClaudeExecutor } from '../services/claudeExecutor.js';
import { FileManager } from '../services/fileManager.js';

interface ExecuteData {
  projectId: string;
  command: string;
  targetFiles?: string[];
  workingDirectory?: string;
}

export function setupSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`👤 User connected: ${(socket as any).userEmail}`);
    
    // Claude実行ハンドラー
    socket.on('execute', async (data: ExecuteData) => {
      console.log(`🚀 Execute request from ${(socket as any).userEmail}:`, data.command);
      
      const executor = new ClaudeExecutor();
      const executionId = `exec_${Date.now()}`;
      
      try {
        // 実行開始を通知
        socket.emit('execution_started', { executionId });
        
        // ファイルマネージャーの準備
        const fileManager = new FileManager();
        const workDir = await fileManager.prepareWorkingDirectory(data.projectId);
        
        // Claude実行
        executor.on('output', (output) => {
          socket.emit('output', {
            executionId,
            content: output,
            timestamp: Date.now(),
            stream: 'stdout'
          });
        });
        
        executor.on('error', (error) => {
          socket.emit('output', {
            executionId,
            content: error,
            timestamp: Date.now(),
            stream: 'stderr'
          });
        });
        
        const result = await executor.execute(data.command, workDir);
        
        // 実行完了を通知
        socket.emit('complete', {
          executionId,
          status: result.success ? 'success' : 'error',
          exitCode: result.exitCode,
          filesChanged: result.filesChanged || [],
          duration: result.duration
        });
        
      } catch (error) {
        console.error('❌ Execution error:', error);
        socket.emit('error', {
          code: 'EXECUTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
    
    // 実行停止ハンドラー
    socket.on('stop', async (data: { executionId: string }) => {
      console.log(`🛑 Stop request for execution: ${data.executionId}`);
      // TODO: 実行中のプロセスを停止
      socket.emit('execution_stopped', { executionId: data.executionId });
    });
    
    // ファイル同期ハンドラー
    socket.on('file:sync', async (data: { projectId: string; action: 'download' | 'upload' }) => {
      console.log(`📁 File sync request: ${data.action} for project ${data.projectId}`);
      
      try {
        const fileManager = new FileManager();
        
        if (data.action === 'download') {
          await fileManager.downloadProjectFiles(data.projectId);
          socket.emit('file:sync_complete', { status: 'success', action: 'download' });
        } else {
          const changes = await fileManager.uploadProjectFiles(data.projectId);
          socket.emit('file:sync_complete', { 
            status: 'success', 
            action: 'upload',
            changes 
          });
        }
      } catch (error) {
        console.error('❌ File sync error:', error);
        socket.emit('error', {
          code: 'FILE_SYNC_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });
    
    // 切断ハンドラー
    socket.on('disconnect', () => {
      console.log(`👋 User disconnected: ${(socket as any).userEmail}`);
    });
  });
}