import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { useFiles } from '../hooks/useFiles';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useSwipeGesture } from '../hooks/useSwipeGesture';
import { Project, FileNode } from '../types';
import { FileList } from '../components/files/FileList';
import { CreateFileModal } from '../components/files/CreateFileModal';
import { FileEditor } from '../components/editor/FileEditor';
import { ExecutionPanel } from '../components/execution/ExecutionPanel';
import { ClaudeMdPanel } from '../components/claude/ClaudeMdPanel';
import { MobileLayout } from '../components/layout/MobileLayout';
import { MobileTabs } from '../components/layout/MobileTabs';
import { PullToRefresh } from '../components/common/PullToRefresh';
import { MobileToolbar } from '../components/common/MobileToolbar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { Breadcrumb } from '../components/common/Breadcrumb';
import toast from 'react-hot-toast';

export const ProjectDetailPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const { files, loading: filesLoading, createFile, updateFile, deleteFile, refetch: refetchFiles } = useFiles(projectId);
  const [isCreateFileModalOpen, setIsCreateFileModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [activeTab, setActiveTab] = useState('files');
  const isMobile = useIsMobile();
  const contentRef = useRef<HTMLDivElement>(null);

  // スワイプジェスチャーの設定（すべてのHooksは条件分岐の前に呼び出す）
  useSwipeGesture(contentRef, {
    onSwipeLeft: () => {
      if (isMobile) {
        const tabs = ['files', 'editor', 'execution', 'claude'];
        const currentIndex = tabs.indexOf(activeTab);
        if (currentIndex < tabs.length - 1) {
          setActiveTab(tabs[currentIndex + 1]);
        }
      }
    },
    onSwipeRight: () => {
      if (isMobile) {
        const tabs = ['files', 'editor', 'execution', 'claude'];
        const currentIndex = tabs.indexOf(activeTab);
        if (currentIndex > 0) {
          setActiveTab(tabs[currentIndex - 1]);
        }
      }
    }
  });

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
        <LoadingSpinner size="lg" message="プロジェクトを読み込んでいます..." />
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

  const handleFilesChanged = async (changedFiles: string[]) => {
    console.log('📝 Files changed:', changedFiles);
    toast.success(`${changedFiles.length}ファイルが更新されました`);
    
    // ファイルリストを再取得
    await refetchFiles();
    
    // 選択中のファイルが変更された場合は再読み込み
    if (selectedFile && changedFiles.includes(selectedFile.path)) {
      const updatedFile = files.find(f => f.id === selectedFile.id);
      if (updatedFile) {
        setSelectedFile(updatedFile);
      }
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
      },
      {
        id: 'claude',
        label: 'CLAUDE',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
          <div ref={contentRef} className="flex-1 overflow-y-auto bg-gray-50">
            {activeTab === 'files' && (
              <PullToRefresh onRefresh={refetchFiles}>
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
                      <LoadingSpinner message="ファイルを読み込んでいます..." />
                    </div>
                  ) : (
                    <FileList
                      files={files}
                      onFileSelect={handleFileSelect}
                      onFileDelete={handleFileDelete}
                    />
                  )}
                </div>
              </PullToRefresh>
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
                    <MobileToolbar
                      actions={[
                        {
                          icon: (
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V2" />
                            </svg>
                          ),
                          label: '保存',
                          onClick: () => handleFileSave(selectedFile.id, selectedFile.content || '')
                        },
                        {
                          icon: (
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          ),
                          label: '閉じる',
                          onClick: () => setSelectedFile(null)
                        }
                      ]}
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
                <ExecutionPanel projectId={projectId!} onFilesChanged={handleFilesChanged} />
              </div>
            )}

            {activeTab === 'claude' && (
              <div className="p-4 h-full">
                <ClaudeMdPanel projectId={projectId!} projectName={project.name} />
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
          <div className="py-4">
            <Breadcrumb 
              items={[
                { label: 'ホーム', path: '/' },
                { label: 'プロジェクト', path: '/projects' },
                { label: project.name }
              ]}
            />
          </div>
          <div className="flex justify-between items-center pb-6">
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            
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
                <LoadingSpinner message="ファイルを読み込んでいます..." />
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
            <ExecutionPanel projectId={projectId!} onFilesChanged={handleFilesChanged} />
          </div>

          <div className="mt-6">
            <ClaudeMdPanel projectId={projectId!} projectName={project.name} />
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