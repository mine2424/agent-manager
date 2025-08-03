import React, { useState, useEffect } from 'react';
import { FileNode } from '../../types';

interface FileViewerProps {
  file: FileNode | null;
  onClose: () => void;
  onSave?: (fileId: string, content: string) => Promise<void>;
}

export const FileViewer: React.FC<FileViewerProps> = ({ 
  file, 
  onClose, 
  onSave 
}) => {
  const [content, setContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (file) {
      setContent(file.content || '');
      setIsEditing(false);
      setHasChanges(false);
    }
  }, [file]);

  if (!file) return null;

  const handleSave = async () => {
    if (!onSave || !hasChanges) return;
    
    setIsSaving(true);
    try {
      await onSave(file.id, content);
      setHasChanges(false);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save file:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    setHasChanges(e.target.value !== file.content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-5/6 flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold">{file.name}</h3>
            {hasChanges && (
              <span className="text-sm text-orange-600">● 未保存の変更</span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {onSave && (
              <>
                {!isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    編集
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={!hasChanges || isSaving}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      {isSaving ? '保存中...' : '保存'}
                    </button>
                    <button
                      onClick={() => {
                        setContent(file.content || '');
                        setIsEditing(false);
                        setHasChanges(false);
                      }}
                      disabled={isSaving}
                      className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      キャンセル
                    </button>
                  </>
                )}
              </>
            )}
            
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-auto">
          {isEditing ? (
            <textarea
              value={content}
              onChange={handleContentChange}
              onKeyDown={handleKeyDown}
              className="w-full h-full p-4 font-mono text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="ファイルの内容を入力してください"
            />
          ) : (
            <pre className="w-full h-full p-4 bg-gray-50 rounded overflow-auto">
              <code className="text-sm font-mono">
                {content || '(空のファイル)'}
              </code>
            </pre>
          )}
        </div>
        
        {isEditing && (
          <div className="p-2 border-t text-xs text-gray-500 text-center">
            Ctrl+S (Cmd+S) で保存
          </div>
        )}
      </div>
    </div>
  );
};