import React from 'react';
import { FileNode } from '../../types';

interface FileListProps {
  files: FileNode[];
  onFileSelect: (file: FileNode) => void;
  onFileDelete: (fileId: string, fileName: string) => void;
}

export const FileList: React.FC<FileListProps> = ({ 
  files, 
  onFileSelect, 
  onFileDelete 
}) => {
  const getFileIcon = (file: FileNode) => {
    if (file.isDirectory) {
      return (
        <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      );
    }
    
    return (
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = (e: React.MouseEvent, fileId: string, fileName: string) => {
    e.stopPropagation();
    if (window.confirm(`ファイル「${fileName}」を削除しますか？`)) {
      onFileDelete(fileId, fileName);
    }
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p className="mt-2">ファイルがありません</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-200">
      {files.map((file) => (
        <div
          key={file.id}
          onClick={() => !file.isDirectory && onFileSelect(file)}
          className={`
            flex items-center justify-between p-3 hover:bg-gray-50
            ${file.isDirectory ? 'cursor-default' : 'cursor-pointer'}
          `}
        >
          <div className="flex items-center space-x-3">
            {getFileIcon(file)}
            <div>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">{file.path}</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {!file.isDirectory && (
              <span className="text-xs text-gray-500">
                {formatFileSize(file.size)}
              </span>
            )}
            
            <button
              onClick={(e) => handleDelete(e, file.id, file.name)}
              className="text-red-500 hover:text-red-700 p-1"
              aria-label="削除"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};