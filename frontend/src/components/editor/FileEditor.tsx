import React, { useRef, useState, useEffect } from 'react';
import Editor, { OnMount, Monaco } from '@monaco-editor/react';
import { FileNode } from '../../types';

interface FileEditorProps {
  file: FileNode | null;
  onSave: (fileId: string, content: string) => Promise<void>;
  onClose: () => void;
  isMobile?: boolean;
}

export const FileEditor: React.FC<FileEditorProps> = ({ file, onSave, onClose, isMobile = false }) => {
  const [content, setContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);

  useEffect(() => {
    if (file) {
      setContent(file.content || '');
      setHasChanges(false);
    }
  }, [file]);

  if (!file) return null;

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // 保存ショートカットの設定
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });

    // フォーカスを設定
    editor.focus();
  };

  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    setHasChanges(newContent !== (file.content || ''));
  };

  const handleSave = async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      await onSave(file.id, content);
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const getLanguage = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'json': 'json',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'less': 'less',
      'py': 'python',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'cs': 'csharp',
      'go': 'go',
      'rs': 'rust',
      'php': 'php',
      'rb': 'ruby',
      'swift': 'swift',
      'kt': 'kotlin',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'md': 'markdown',
      'sh': 'shell',
      'bash': 'shell',
      'sql': 'sql'
    };
    
    return languageMap[ext || ''] || 'plaintext';
  };

  // モバイル用の簡略化されたレイアウト
  if (isMobile) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1">
          <Editor
            height="100%"
            language={getLanguage(file.name)}
            value={content}
            onChange={handleEditorChange}
            onMount={handleEditorDidMount}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 12,
              wordWrap: 'on',
              automaticLayout: true,
              scrollBeyondLastLine: false,
              renderWhitespace: 'none',
              tabSize: 2,
              insertSpaces: true,
              formatOnPaste: true,
              formatOnType: true,
              lineNumbers: 'on',
              folding: true,
              quickSuggestions: false,
              parameterHints: { enabled: false },
              suggestOnTriggerCharacters: false
            }}
          />
        </div>
        
        <div className="bg-gray-800 text-white flex items-center justify-between px-3 py-2 border-t">
          <div className="flex items-center space-x-2">
            {hasChanges && (
              <span className="text-xs text-orange-400">● 未保存</span>
            )}
          </div>
          
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    );
  }

  // デスクトップ用のフルスクリーンレイアウト
  return (
    <div className="fixed inset-0 bg-gray-900 flex flex-col z-50">
      <div className="bg-gray-800 text-white flex items-center justify-between px-4 py-2">
        <div className="flex items-center space-x-4">
          <h3 className="font-semibold">{file.name}</h3>
          {hasChanges && (
            <span className="text-sm text-orange-400">● 未保存</span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '保存中...' : '保存 (Ctrl+S)'}
          </button>
          
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            閉じる
          </button>
        </div>
      </div>
      
      <div className="flex-1">
        <Editor
          height="100%"
          language={getLanguage(file.name)}
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            wordWrap: 'on',
            automaticLayout: true,
            scrollBeyondLastLine: false,
            renderWhitespace: 'selection',
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true
          }}
        />
      </div>
    </div>
  );
};