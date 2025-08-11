import { Server as SocketIOServer, Socket } from 'socket.io';
import { ClaudeExecutor } from '../services/claudeExecutor.js';
import { FileManager } from '../services/fileManager.js';
import { validateSocketEvent, sanitizers } from '../middleware/validation.js';
import { auditLogger } from '../services/auditLogger.js';
import { setupSpecHandlers } from './specHandlers.js';
import { registerClaudeMdHandlers } from './claudeMdHandlers.js';
import { performanceMonitor } from '../services/performanceMonitor.js';

interface ExecuteData {
  projectId: string;
  command: string;
  targetFiles?: string[];
  workingDirectory?: string;
}

export function setupSocketHandlers(io: SocketIOServer) {
  // Track WebSocket connections
  let connectedClients = 0;
  let totalMessages = 0;
  
  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    const userEmail = (socket as any).userEmail;
    const ipAddress = socket.handshake.address;
    
    console.log(`👤 User connected: ${userEmail}`);
    connectedClients++;
    
    // Update WebSocket metrics
    performanceMonitor.updateWebSocketMetrics({
      connectedClients,
      messagesReceived: totalMessages
    });
    
    // Log authentication
    auditLogger.logAuth('login', userId, userEmail, ipAddress);
    
    // Claude実行ハンドラー
    socket.on('execute', async (data: ExecuteData) => {
      console.log(`🚀 Execute request from ${userEmail}:`, data.command);
      
      // Log execution start
      auditLogger.logExecution('start', data.command, userId, data.projectId);
      
      // Validate and sanitize input
      const validationResult = await new Promise<void>((resolve, reject) => {
        validateSocketEvent('execute')(data, (error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      }).catch((validationError) => {
        // Log validation failure
        auditLogger.logSecurityEvent('invalid_input', userId, ipAddress, {
          command: data.command,
          error: validationError instanceof Error ? validationError.message : 'Invalid input'
        });
        
        socket.emit('error', {
          code: 'VALIDATION_ERROR',
          message: validationError instanceof Error ? validationError.message : 'Invalid input',
        });
        return false;
      });
      
      if (validationResult === false) return;
      
      const executor = new ClaudeExecutor();
      const executionId = `exec_${Date.now()}`;
      
      // Track execution start for performance
      performanceMonitor.trackExecutionStart(executionId);
      
      try {
        // 実行開始を通知
        socket.emit('execution_started', { executionId });
        
        // ファイルマネージャーの準備
        const fileManager = new FileManager();
        const workDir = await fileManager.prepareWorkingDirectory(data.projectId);
        
        // プロジェクトファイルをダウンロード
        await fileManager.downloadProjectFiles(data.projectId);
        
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
        
        const startTime = Date.now();
        const result = await executor.execute(data.command, workDir, data.projectId);
        const executionTime = Date.now() - startTime;
        
        // Track execution completion for performance
        performanceMonitor.trackExecutionComplete(executionId, result.success);
        
        // Log execution result
        auditLogger.logExecution(
          result.success ? 'success' : 'failed',
          data.command,
          userId,
          data.projectId,
          executionTime,
          undefined
        );
        
        // 変更されたファイルをFirestoreにアップロード
        if (result.filesChanged && result.filesChanged.length > 0) {
          console.log(`📤 Uploading ${result.filesChanged.length} changed files to Firestore`);
          await fileManager.uploadProjectFiles(data.projectId);
        }
        
        // 実行完了を通知
        socket.emit('complete', {
          executionId,
          status: result.success ? 'success' : 'error',
          exitCode: result.exitCode,
          filesChanged: result.filesChanged || [],
          duration: result.duration
        });
        
        // 作業ディレクトリをクリーンアップ
        await fileManager.cleanupWorkingDirectory(data.projectId);
        
      } catch (error) {
        console.error('❌ Execution error:', error);
        
        // Track execution failure for performance
        performanceMonitor.trackExecutionComplete(executionId, false);
        
        // Log execution failure
        auditLogger.logExecution(
          'failed',
          data.command,
          userId,
          data.projectId,
          undefined,
          error instanceof Error ? error.message : 'Unknown error'
        );
        
        // エラーの詳細をログに出力
        if (error instanceof Error) {
          console.error('Error name:', error.name);
          console.error('Error message:', error.message);
          console.error('Error stack:', error.stack);
        }
        
        socket.emit('error', {
          code: 'EXECUTION_FAILED',
          message: error instanceof Error ? error.message : 'Unknown error',
          details: {
            name: error instanceof Error ? error.name : 'UnknownError',
            stack: error instanceof Error ? error.stack : undefined
          }
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
      
      // Validate projectId
      if (!data.projectId || typeof data.projectId !== 'string' || data.projectId.length > 100) {
        socket.emit('error', {
          code: 'VALIDATION_ERROR',
          message: 'Invalid project ID',
        });
        return;
      }
      
      // Sanitize projectId
      const sanitizedProjectId = sanitizers.sanitizePath(data.projectId);
      
      try {
        const fileManager = new FileManager();
        
        if (data.action === 'download') {
          await fileManager.downloadProjectFiles(sanitizedProjectId);
          socket.emit('file:sync_complete', { status: 'success', action: 'download' });
        } else {
          const changes = await fileManager.uploadProjectFiles(sanitizedProjectId);
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
    
    // Set up spec-driven development handlers
    setupSpecHandlers(socket);
    
    // Set up CLAUDE.md generation handlers
    registerClaudeMdHandlers(socket);
    
    // Track messages
    socket.onAny(() => {
      totalMessages++;
      performanceMonitor.updateWebSocketMetrics({
        messagesReceived: totalMessages
      });
    });
    
    // 切断ハンドラー
    socket.on('disconnect', () => {
      console.log(`👋 User disconnected: ${userEmail}`);
      connectedClients = Math.max(0, connectedClients - 1);
      
      // Update WebSocket metrics
      performanceMonitor.updateWebSocketMetrics({
        connectedClients
      });
      
      // Log logout
      auditLogger.logAuth('logout', userId, userEmail, ipAddress);
    });
  });
}