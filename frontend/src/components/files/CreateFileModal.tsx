import React, { useState } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { MobileModal } from '../layout/MobileModal';

interface CreateFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, content: string) => Promise<void>;
  currentPath?: string;
}

export const CreateFileModal: React.FC<CreateFileModalProps> = ({
  isOpen,
  onClose,
  onCreate,
  currentPath = ''
}) => {
  const [fileName, setFileName] = useState('');
  const [initialContent, setInitialContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const isMobile = useIsMobile();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName.trim()) return;

    setIsCreating(true);
    try {
      const fullPath = currentPath ? `${currentPath}/${fileName.trim()}` : fileName.trim();
      await onCreate(fileName.trim(), initialContent);
      setFileName('');
      setInitialContent('');
      onClose();
    } catch (error) {
      console.error('Failed to create file:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const getFileTemplate = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase();
    
    const templates: Record<string, string> = {
      'js': '// JavaScript file\n\n',
      'ts': '// TypeScript file\n\n',
      'jsx': 'import React from \'react\';\n\nexport const Component = () => {\n  return (\n    <div>\n      \n    </div>\n  );\n};',
      'tsx': 'import React from \'react\';\n\ninterface Props {\n  \n}\n\nexport const Component: React.FC<Props> = () => {\n  return (\n    <div>\n      \n    </div>\n  );\n};',
      'py': '# Python file\n\n',
      'md': '# Title\n\n',
      'json': '{\n  \n}',
      'html': '<!DOCTYPE html>\n<html lang="ja">\n<head>\n  <meta charset="UTF-8">\n  <title>Document</title>\n</head>\n<body>\n  \n</body>\n</html>',
      'css': '/* CSS file */\n\n'
    };
    
    return templates[ext || ''] || '';
  };

  const handleFileNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setFileName(name);
    
    // ファイル名に基づいてテンプレートを設定
    if (name && !initialContent) {
      setInitialContent(getFileTemplate(name));
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className={isMobile ? 'p-4' : ''}>
      <div className="mb-4">
        <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-1">
          ファイル名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="fileName"
          value={fileName}
          onChange={handleFileNameChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="index.js"
          required
          autoFocus
        />
        {currentPath && (
          <p className="mt-1 text-xs text-gray-500">
            パス: {currentPath}/
          </p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
          初期内容（オプション）
        </label>
        <textarea
          id="content"
          value={initialContent}
          onChange={(e) => setInitialContent(e.target.value)}
          rows={isMobile ? 6 : 10}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
          placeholder="ファイルの初期内容を入力してください"
        />
      </div>

      <div className={`flex justify-end space-x-3 ${isMobile ? 'border-t pt-4' : ''}`}>
        <button
          type="button"
          onClick={onClose}
          disabled={isCreating}
          className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 disabled:opacity-50"
        >
          キャンセル
        </button>
        <button
          type="submit"
          disabled={!fileName.trim() || isCreating}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? '作成中...' : '作成'}
        </button>
      </div>
    </form>
  );

  if (isMobile) {
    return (
      <MobileModal
        isOpen={isOpen}
        onClose={onClose}
        title="新しいファイルを作成"
      >
        {formContent}
      </MobileModal>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4">新しいファイルを作成</h2>
        
        {formContent}
      </div>
    </div>
  );
};