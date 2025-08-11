import React, { useState } from 'react';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { MobileModal } from '../layout/MobileModal';
import { useValidation, ValidationSchemas, Sanitizers } from '../../utils/validation';

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
  const { errors, validateForm, validateField, clearErrors } = useValidation(ValidationSchemas.project);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = {
      name: name.trim(),
      description: description.trim()
    };
    
    if (!validateForm(formData)) {
      return;
    }

    setIsCreating(true);
    try {
      // Sanitize inputs before creating
      const sanitizedName = Sanitizers.sanitizeProjectName(formData.name);
      const sanitizedDescription = formData.description;
      
      await onCreate(sanitizedName, sanitizedDescription);
      setName('');
      setDescription('');
      clearErrors();
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
          onChange={(e) => {
            setName(e.target.value);
            validateField('name', e.target.value);
          }}
          className={`w-full px-3 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 ${errors.name ? 'focus:ring-red-500' : 'focus:ring-blue-500'}`}
          placeholder="My Awesome Project"
          required
          autoFocus
        />
        {errors.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
      </div>

      <div className="mb-6">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          説明（オプション）
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value);
            validateField('description', e.target.value);
          }}
          rows={3}
          className={`w-full px-3 py-2 border ${errors.description ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 ${errors.description ? 'focus:ring-red-500' : 'focus:ring-blue-500'}`}
          placeholder="プロジェクトの説明を入力してください"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
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