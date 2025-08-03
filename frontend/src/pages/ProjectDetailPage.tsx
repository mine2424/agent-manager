import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useFiles } from '../hooks/useFiles';
import { useIsMobile } from '../hooks/useMediaQuery';
import { Project, FileNode } from '../types';
import { FileList } from '../components/files/FileList';
import { CreateFileModal } from '../components/files/CreateFileModal';
import { FileEditor } from '../components/editor/FileEditor';
import { ExecutionPanel } from '../components/execution/ExecutionPanel';
import { MobileLayout } from '../components/layout/MobileLayout';
import { MobileTabs } from '../components/layout/MobileTabs';
import toast from 'react-hot-toast';

export const ProjectDetailPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const { files, loading: filesLoading, createFile, updateFile, deleteFile } = useFiles(projectId);
  const [isCreateFileModalOpen, setIsCreateFileModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [activeTab, setActiveTab] = useState('files');
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId || !user) return;

      try {
        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        
        if (!projectDoc.exists()) {
          toast.error('プロジェクトが見つかりません');
          navigate('/projects');
          return;
        }

        const projectData = projectDoc.data();
        
        // 権限チェック
        if (projectData.userId !== user.uid) {
          toast.error('このプロジェクトへのアクセス権限がありません');
          navigate('/projects');
          return;
        }

        setProject({
          id: projectDoc.id,
          ...projectData,
          createdAt: projectData.createdAt?.toDate(),
          updatedAt: projectData.updatedAt?.toDate()
        } as Project);
      } catch (error) {
        console.error('Error fetching project:', error);
        toast.error('プロジェクトの読み込みに失敗しました');
        navigate('/projects');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [projectId, user, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const handleCreateFile = async (name: string, content: string) => {
    try {
      await createFile(name, name, content);
      setIsCreateFileModalOpen(false);
    } catch (error) {
      console.error('Failed to create file:', error);
    }
  };

  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
    if (isMobile) {
      setActiveTab('editor');
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      await deleteFile(fileId);
      if (selectedFile?.id === fileId) {
        setSelectedFile(null);
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
    }
  };

  const handleFileSave = async (fileId: string, content: string) => {
    try {
      await updateFile(fileId, content);
      // 選択中のファイルの内容を更新
      if (selectedFile && selectedFile.id === fileId) {
        setSelectedFile({ ...selectedFile, content });
      }
    } catch (error) {
      console.error('Failed to save file:', error);
    }
  };

  // モバイルレイアウト
  if (isMobile) {
    const mobileTabs = [
      {
        id: 'files',
        label: 'ファイル',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
        )
      },
      {
        id: 'editor',
        label: 'エディター',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        )
      },
      {
        id: 'execution',
        label: '実行',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      }
    ];

    return (
      <MobileLayout>
        <div className="flex flex-col h-full">
          {/* プロジェクト情報 */}
          <div className="bg-white p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
            {project.description && (
              <p className="text-sm text-gray-600 mt-1">{project.description}</p>
            )}
          </div>

          {/* タブ */}
          <MobileTabs
            tabs={mobileTabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />

          {/* タブコンテンツ */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {activeTab === 'files' && (
              <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-medium text-gray-700">ファイル一覧</h3>
                  <button
                    onClick={() => setIsCreateFileModalOpen(true)}
                    className="p-2 bg-blue-600 text-white rounded"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </button>
                </div>
                
                {filesLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <FileList
                    files={files}
                    onFileSelect={handleFileSelect}
                    onFileDelete={handleFileDelete}
                  />
                )}
              </div>
            )}

            {activeTab === 'editor' && (
              <div className="h-full">
                {selectedFile ? (
                  <div className="h-full bg-white">
                    <div className="flex items-center justify-between p-3 border-b">
                      <span className="text-sm font-medium text-gray-700">{selectedFile.name}</span>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="p-1 text-gray-500"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <FileEditor
                      file={selectedFile}
                      onClose={() => setSelectedFile(null)}
                      onSave={handleFileSave}
                      isMobile={true}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <svg className="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    <p className="text-gray-600">ファイルを選択してください</p>
                    <button
                      onClick={() => setActiveTab('files')}
                      className="mt-4 text-sm text-blue-600 hover:text-blue-700"
                    >
                      ファイル一覧へ
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'execution' && (
              <div className="p-4">
                <ExecutionPanel projectId={projectId} />
              </div>
            )}
          </div>
        </div>

        <CreateFileModal
          isOpen={isCreateFileModalOpen}
          onClose={() => setIsCreateFileModalOpen(false)}
          onCreate={handleCreateFile}
        />
      </MobileLayout>
    );
  }

  // デスクトップレイアウト
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/projects')}
                className="mr-4 text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="text-sm text-gray-500 hover:text-gray-700">
                設定
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-semibold mb-4">プロジェクト詳細</h2>
            
            {project.description && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700">説明</h3>
                <p className="mt-1 text-sm text-gray-600">{project.description}</p>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">作成日時:</span>
                <span className="ml-2 text-gray-600">
                  {project.createdAt?.toLocaleString('ja-JP')}
                </span>
              </div>
              <div>
                <span className="font-medium text-gray-700">更新日時:</span>
                <span className="ml-2 text-gray-600">
                  {project.updatedAt?.toLocaleString('ja-JP')}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">ファイル管理</h2>
              <button
                onClick={() => setIsCreateFileModalOpen(true)}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                新規ファイル
              </button>
            </div>
            
            {filesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <FileList
                files={files}
                onFileSelect={handleFileSelect}
                onFileDelete={handleFileDelete}
              />
            )}
          </div>

          <div className="mt-6">
            <ExecutionPanel projectId={projectId} />
          </div>
        </div>
      </main>

      <CreateFileModal
        isOpen={isCreateFileModalOpen}
        onClose={() => setIsCreateFileModalOpen(false)}
        onCreate={handleCreateFile}
      />

      <FileEditor
        file={selectedFile}
        onClose={() => setSelectedFile(null)}
        onSave={handleFileSave}
      />
    </div>
  );
};