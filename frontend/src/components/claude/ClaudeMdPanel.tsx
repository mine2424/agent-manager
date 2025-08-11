import React, { useState, useEffect } from 'react';
import { socket } from '../../services/socket';
import { useToast } from '../../hooks/useToast';
import { Download, RefreshCw, FileText, Settings } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ClaudeMdPanelProps {
  projectId: string;
  projectName: string;
}

export const ClaudeMdPanel: React.FC<ClaudeMdPanelProps> = ({ projectId, projectName }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [customInstructions, setCustomInstructions] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    // Listen for CLAUDE.md generation events
    const handleGenerated = (data: { projectId: string; content: string; timestamp: number }) => {
      if (data.projectId === projectId) {
        setContent(data.content);
        setLastGenerated(new Date(data.timestamp));
        setLoading(false);
        showToast('CLAUDE.md generated successfully', 'success');
      }
    };

    const handleUpdated = (data: { projectId: string; changeType: string; timestamp: number }) => {
      if (data.projectId === projectId) {
        showToast(`CLAUDE.md updated (${data.changeType})`, 'info');
        // Optionally regenerate to get latest content
        generateClaudeMd();
      }
    };

    const handleError = (data: { message: string; code: string }) => {
      setLoading(false);
      showToast(data.message, 'error');
    };

    socket.on('claude_md:generated', handleGenerated);
    socket.on('claude_md:updated', handleUpdated);
    socket.on('claude_md:error', handleError);

    return () => {
      socket.off('claude_md:generated', handleGenerated);
      socket.off('claude_md:updated', handleUpdated);
      socket.off('claude_md:error', handleError);
    };
  }, [projectId, showToast]);

  const generateClaudeMd = () => {
    setLoading(true);
    socket.emit('claude_md:generate', {
      projectId,
      customInstructions: customInstructions || undefined
    });
  };

  const downloadClaudeMd = () => {
    if (!content) {
      showToast('No content to download', 'warning');
      return;
    }

    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CLAUDE_${projectName}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('CLAUDE.md downloaded', 'success');
  };

  const copyToClipboard = () => {
    if (!content) {
      showToast('No content to copy', 'warning');
      return;
    }

    navigator.clipboard.writeText(content).then(() => {
      showToast('Copied to clipboard', 'success');
    }).catch(() => {
      showToast('Failed to copy to clipboard', 'error');
    });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              CLAUDE.md Generator
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {lastGenerated && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Last generated: {lastGenerated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Settings"
            >
              <Settings className="h-4 w-4" />
            </button>
            <button
              onClick={generateClaudeMd}
              disabled={loading}
              className="px-3 py-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-1"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Generating...' : 'Generate'}</span>
            </button>
            <button
              onClick={downloadClaudeMd}
              disabled={!content}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Custom Instructions (Optional)
            </label>
            <textarea
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Add custom instructions for Claude to follow when working on this project..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
              rows={3}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400">
              These instructions will be included in the CLAUDE.md file to guide Claude's behavior.
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {!content && !loading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <FileText className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-lg font-medium mb-2">No CLAUDE.md generated yet</p>
            <p className="text-sm text-center max-w-md mb-4">
              Generate a CLAUDE.md file to provide context about your project to Claude. 
              This helps Claude understand your project structure, conventions, and requirements.
            </p>
            <button
              onClick={generateClaudeMd}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              Generate Now
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Analyzing project and generating CLAUDE.md...</p>
            </div>
          </div>
        ) : (
          <div className="prose dark:prose-invert max-w-none">
            <div className="mb-4 flex justify-end space-x-2">
              <button
                onClick={copyToClipboard}
                className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setContent('')}
                className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Clear
              </button>
            </div>
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                code: ({ node, inline, className, children, ...props }) => {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline && match ? (
                    <pre className="bg-gray-100 dark:bg-gray-900 rounded-lg p-4 overflow-x-auto">
                      <code className={className} {...props}>
                        {children}
                      </code>
                    </pre>
                  ) : (
                    <code className="bg-gray-100 dark:bg-gray-900 px-1 py-0.5 rounded" {...props}>
                      {children}
                    </code>
                  );
                },
                h1: ({ children }) => (
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 mt-6">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-5">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2 mt-4">
                    {children}
                  </h3>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside space-y-1 text-gray-700 dark:text-gray-300">
                    {children}
                  </ol>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-600 dark:text-gray-400">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Auto-update notification */}
      <div className="p-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800">
        <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
          CLAUDE.md automatically updates when files change, specs are generated, or commands are executed
        </p>
      </div>
    </div>
  );
};

export default ClaudeMdPanel;