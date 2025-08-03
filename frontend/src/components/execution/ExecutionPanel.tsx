import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../services/firebase';

interface ExecutionPanelProps {
  projectId: string;
}

interface OutputLine {
  content: string;
  timestamp: number;
  stream: 'stdout' | 'stderr';
}

export const ExecutionPanel: React.FC<ExecutionPanelProps> = ({ projectId }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [command, setCommand] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [output, setOutput] = useState<OutputLine[]>([]);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const outputEndRef = useRef<HTMLDivElement>(null);

  // WebSocket接続
  useEffect(() => {
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

        setSocket(newSocket);
      } catch (error) {
        console.error('Failed to connect:', error);
      }
    };

    connectSocket();

    return () => {
      socket?.disconnect();
    };
  }, [user]);

  // 出力の自動スクロール
  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  const handleExecute = () => {
    if (!socket || !command.trim() || isExecuting) return;

    setOutput([{
      content: `> ${command}\n`,
      timestamp: Date.now(),
      stream: 'stdout'
    }]);

    socket.emit('execute', {
      projectId,
      command: command.trim()
    });
  };

  const handleStop = () => {
    if (!socket || !currentExecutionId) return;
    
    socket.emit('stop', {
      executionId: currentExecutionId
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
            <div className={`w-2 h-2 rounded-full mr-1 ${isConnected ? 'bg-green-600' : 'bg-red-600'}`} />
            {isConnected ? '接続中' : '未接続'}
          </div>
          <button
            onClick={clearOutput}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            クリア
          </button>
        </div>
      </div>

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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={!isConnected || isExecuting}
            />
            <div className="flex flex-col space-y-2">
              {!isExecuting ? (
                <button
                  onClick={handleExecute}
                  disabled={!isConnected || !command.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  実行
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
            Shift+Enter で改行、Enter で実行
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