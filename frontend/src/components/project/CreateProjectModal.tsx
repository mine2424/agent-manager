import React, { useState } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { MobileModal } from '../layout/MobileModal';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string, description: string) => Promise<void>;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({
  isOpen,
  onClose,
  onCreate
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const isMobile = useIsMobile();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsCreating(true);
    try {
      await onCreate(name.trim(), description.trim());
      setName('');
      setDescription('');
      onClose();
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const formContent = (
    <form onSubmit={handleSubmit} className={isMobile ? 'p-4' : ''}>
      <div className="mb-4">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          プロジェクト名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="My Awesome Project"
          required
          autoFocus
        />
      </div>

      <div className="mb-6">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          説明（オプション）
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="プロジェクトの説明を入力してください"
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
          disabled={!name.trim() || isCreating}
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
        title="新しいプロジェクトを作成"
      >
        {formContent}
      </MobileModal>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">新しいプロジェクトを作成</h2>
        
        {formContent}
      </div>
    </div>
  );
};