import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs';
import { FileManager } from './fileManager.js';

interface ExecutionResult {
  success: boolean;
  exitCode: number | null;
  output: string[];
  filesChanged?: string[];
  duration: number;
}

export class ClaudeExecutor extends EventEmitter {
  private process: ChildProcess | null = null;
  private outputBuffer: string[] = [];
  private startTime: number = 0;
  private fileManager: FileManager;
  private projectId: string = '';

  constructor() {
    super();
    this.fileManager = new FileManager();
  }

  async execute(command: string, workingDirectory: string, projectId: string): Promise<ExecutionResult> {
    this.projectId = projectId;
    return new Promise((resolve, reject) => {
      if (this.process) {
        reject(new Error('既に実行中のプロセスがあります'));
        return;
      }

      this.startTime = Date.now();
      this.outputBuffer = [];

      console.log(`📂 Working directory: ${workingDirectory}`);
      console.log(`💬 Command: ${command}`);

      // For testing: use echo command instead of Claude CLI
      // This will help us verify the execution flow
      const useTestMode = process.env.USE_TEST_MODE === 'true';
      
      if (useTestMode) {
        // Test mode: just echo the command
        this.process = spawn('echo', [`Claude would process: "${command}"`], {
          cwd: workingDirectory,
          shell: true
        });
      } else {
        // Claude CLIの実行 - 実際のClaude Codeを起動
        const claudePath = process.env.CLAUDE_CLI_PATH || 'claude';
        
        console.log(`🤖 Executing Claude with command: ${command}`);
        console.log(`   Using Claude at: ${claudePath}`);
        
        // Create a shell script that will run Claude with the command
        const scriptContent = `#!/bin/bash
cd "${workingDirectory}"
echo "${command.replace(/"/g, '\\"')}" | ${claudePath} --print --output-format text
`;
        
        const scriptFile = path.join(workingDirectory, '.claude-exec.sh');
        fs.writeFileSync(scriptFile, scriptContent, { mode: 0o755 });
        
        // Execute the script
        this.process = spawn('bash', [scriptFile], {
          cwd: workingDirectory,
          env: {
            ...process.env,
            HOME: process.env.HOME,
            PATH: process.env.PATH,
            USER: process.env.USER,
            // Ensure Claude can access its config
            CLAUDE_HOME: process.env.CLAUDE_HOME || path.join(process.env.HOME || '', '.claude')
          }
        });
        
        // Clean up script file after execution starts
        setTimeout(() => {
          try {
            fs.unlinkSync(scriptFile);
          } catch (err) {
            // Ignore cleanup errors
          }
        }, 2000);
      }

      // 標準出力の処理
      this.process.stdout?.on('data', (data) => {
        const output = data.toString();
        this.outputBuffer.push(output);
        this.emit('output', output);
      });

      // 標準エラー出力の処理
      this.process.stderr?.on('data', (data) => {
        const error = data.toString();
        this.outputBuffer.push(`[ERROR] ${error}`);
        this.emit('error', error);
      });

      // Set a timeout for Claude execution (5 minutes)
      const timeout = setTimeout(() => {
        if (this.process) {
          console.log('⏱️ Claude execution timeout - terminating process');
          this.process.kill('SIGTERM');
          setTimeout(() => {
            if (this.process) {
              this.process.kill('SIGKILL');
            }
          }, 5000);
        }
      }, 5 * 60 * 1000); // 5 minutes

      // プロセス終了時の処理
      this.process.on('close', async (code) => {
        clearTimeout(timeout);
        const duration = Date.now() - this.startTime;
        
        // ファイルの変更を検出
        let filesChanged: string[] = [];
        try {
          const changes = await this.fileManager.detectChangedFiles(this.projectId);
          filesChanged = changes.map(file => file.path);
          console.log(`📝 Detected ${filesChanged.length} file changes`);
        } catch (error) {
          console.error('❌ Error detecting file changes:', error);
        }
        
        const result: ExecutionResult = {
          success: code === 0,
          exitCode: code,
          output: this.outputBuffer,
          duration,
          filesChanged
        };

        console.log(`✅ Process exited with code ${code} (duration: ${duration}ms)`);
        
        this.cleanup();
        resolve(result);
      });

      // エラーハンドリング
      this.process.on('error', (error) => {
        console.error('❌ Process error:', error);
        this.cleanup();
        reject(error);
      });
    });
  }

  stop(): void {
    if (this.process) {
      console.log('🛑 Stopping process...');
      this.process.kill('SIGTERM');
      this.cleanup();
    }
  }

  private cleanup(): void {
    this.process = null;
    this.outputBuffer = [];
    this.removeAllListeners();
  }
}