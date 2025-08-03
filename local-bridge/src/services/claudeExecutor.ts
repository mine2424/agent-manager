import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import path from 'path';

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

  async execute(command: string, workingDirectory: string): Promise<ExecutionResult> {
    return new Promise((resolve, reject) => {
      if (this.process) {
        reject(new Error('既に実行中のプロセスがあります'));
        return;
      }

      this.startTime = Date.now();
      this.outputBuffer = [];

      console.log(`📂 Working directory: ${workingDirectory}`);
      console.log(`💬 Command: ${command}`);

      // Claude CLIの実行
      const claudePath = process.env.CLAUDE_CLI_PATH || 'claude';
      this.process = spawn(claudePath, ['code'], {
        cwd: workingDirectory,
        env: {
          ...process.env,
          // Claude CLI用の環境変数を設定
        }
      });

      // 標準入力にコマンドを送信
      if (this.process.stdin) {
        this.process.stdin.write(command + '\n');
        this.process.stdin.end();
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

      // プロセス終了時の処理
      this.process.on('close', (code) => {
        const duration = Date.now() - this.startTime;
        const result: ExecutionResult = {
          success: code === 0,
          exitCode: code,
          output: this.outputBuffer,
          duration,
          filesChanged: [] // TODO: 変更されたファイルを検出
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