import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../services/firebase';
import { validate, ValidationSchemas, Sanitizers } from '../../utils/validation';
import toast from 'react-hot-toast';

interface ExecutionPanelProps {
  projectId: string;
  onFilesChanged?: (files: string[]) => void;
}

interface OutputLine {
  content: string;
  timestamp: number;
  stream: 'stdout' | 'stderr';
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ projectId, onFilesChanged }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [command, setCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const outputEndRef = useRef<HTMLDivElement>(null);

  // WebSocket接続関数
  const connectSocket = async () => {
      if (!user) return;

      try {
        // Firebase IDトークンを取得
        const token = await auth.currentUser?.getIdToken();
        
        const newSocket = io(import.meta.env.VITE_LOCAL_BRIDGE_URL || 'http://localhost:8080', {
          auth: { token }
        });

        newSocket.on('connect', () => {
          console.log('Connected to local bridge');
          setIsConnected(true);
          setConnectionAttempts(0);
        });

        newSocket.on('disconnect', () => {
          console.log('Disconnected from local bridge');
          setIsConnected(false);
        });

        newSocket.on('execution_started', (data) => {
          setCurrentExecutionId(data.executionId);
          setIsExecuting(true);
        });

        newSocket.on('output', (data) => {
          setOutput(prev => [...prev, {
            content: data.content,
            timestamp: data.timestamp,
            stream: data.stream
          }]);
        });

        newSocket.on('complete', (data) => {
          console.log('Execution complete:', data);
          setIsExecuting(false);
          setCurrentExecutionId(null);
          
          if (data.status === 'success') {
            setOutput(prev => [...prev, {
              content: `\n✅ 実行完了 (${data.duration}ms)\n`,
              timestamp: Date.now(),
              stream: 'stdout'
            }]);
            
            // 変更されたファイルがある場合は通知
            if (data.filesChanged && data.filesChanged.length > 0) {
              setOutput(prev => [...prev, {
                content: `\n📝 変更されたファイル: ${data.filesChanged.join(', ')}\n`,
                timestamp: Date.now(),
                stream: 'stdout'
              }]);
              onFilesChanged?.(data.filesChanged);
            }
          } else {
            setOutput(prev => [...prev, {
              content: `\n❌ 実行エラー (exit code: ${data.exitCode})\n`,
              timestamp: Date.now(),
              stream: 'stderr'
            }]);
          }
        });

        newSocket.on('error', (data) => {
          console.error('Socket error:', data);
          setOutput(prev => [...prev, {
            content: `\nエラー: ${data.message}\n`,
            timestamp: Date.now(),
            stream: 'stderr'
          }]);
          setIsExecuting(false);
        });

        newSocket.on('connect_error', (error) => {
          console.error('Connection error:', error);
          setIsConnected(false);
        });

        setSocket(newSocket);
      } catch (error) {
        console.error('Failed to connect:', error);
        setIsConnected(false);
        setOutput(prev => [...prev, {
          content: `\n❌ 接続エラー: ${error instanceof Error ? error.message : 'Unknown error'}\n`,
          timestamp: Date.now(),
          stream: 'stderr'
        }]);
      }
    };

  // WebSocket接続
  useEffect(() => {
    connectSocket();

    // 接続の再試行
    const retryInterval = setInterval(() => {
      if (!isConnected && connectionAttempts < 5) {
        console.log('接続を再試行しています...');
        setConnectionAttempts(prev => prev + 1);
        connectSocket();
      }
    }, 3000);

    return () => {
      clearInterval(retryInterval);
      socket?.disconnect();
    };
  }, [user, isConnected, connectionAttempts]);

  // 出力の自動スクロール
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  const handleExecute = () => {
    if (!socket || !command.trim() || isExecuting) return;
    
    // Validate command
    const validationResult = validate(
      { command: command.trim() },
      ValidationSchemas.execution
    );
    
    if (!validationResult.isValid) {
      toast.error(validationResult.errors.command || '無効なコマンドです');
      return;
    }

    const sanitizedCommand = Sanitizers.sanitizeCommand(command.trim());

    setOutput([{
      content: `> ${sanitizedCommand}\n`,
      timestamp: Date.now(),
      stream: 'stdout'
    }]);

    socket.emit('execute', {
      projectId,
      command: sanitizedCommand
    });
  };

  const handleStop = () => {
    if (!socket || !currentExecutionId) return;
    
    socket.emit('stop', {
      executionId: currentExecutionId
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+Enter または Cmd+Enter で実行
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleExecute();
    }
  };

  const clearOutput = () => {
    setOutput([]);
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Claude実行</h2>
        <div className="flex items-center space-x-2">
          <div className={`flex items-center text-sm ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-green-600' : 'bg-red-600'} ${!isConnected ? 'animate-pulse' : ''}`} />
            {isConnected ? '接続中' : 'ローカルブリッジに接続中...'}
          </div>
          <button
            onClick={clearOutput}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            クリア
          </button>
        </div>
      </div>

      {!isConnected && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            🔌 ローカルブリッジに接続しています... {connectionAttempts > 0 && `(試行 ${connectionAttempts}/5)`}
          </p>
          <p className="text-xs text-yellow-700 mt-1">
            ローカルブリッジが起動していることを確認してください: <code className="bg-yellow-100 px-1">pnpm dev:bridge</code>
          </p>
          <button
            onClick={() => {
              setConnectionAttempts(0);
              connectSocket();
            }}
            className="mt-2 text-xs text-yellow-800 underline hover:text-yellow-900"
          >
            手動で再接続
          </button>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="command" className="block text-sm font-medium text-gray-700 mb-1">
            コマンド
          </label>
          <div className="flex space-x-2">
            <textarea
              id="command"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Claudeへの指示を入力してください..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              disabled={!isConnected || isExecuting}
            />
            <div className="flex flex-col space-y-2">
              {!isExecuting ? (
                <button
                  onClick={handleExecute}
                  disabled={!isConnected || !command.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  title={`${navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter`}
                >
                  <span>実行</span>
                  <kbd className="text-xs bg-blue-700 px-1.5 py-0.5 rounded">
                    {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+↵
                  </kbd>
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  停止
                </button>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {navigator.platform.includes('Mac') ? 'Cmd' : 'Ctrl'}+Enter で実行
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            出力
          </label>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-sm h-96 overflow-y-auto">
            {output.length === 0 ? (
              <div className="text-gray-500">出力がここに表示されます...</div>
            ) : (
              <>
                {output.map((line, index) => (
                  <div
                    key={index}
                    className={line.stream === 'stderr' ? 'text-red-400' : ''}
                  >
                    {line.content.split('\n').map((text, i) => (
                      <div key={i}>{text || '\u00A0'}</div>
                    ))}
                  </div>
                ))}
                <div ref={outputEndRef} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};