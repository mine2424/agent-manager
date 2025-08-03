import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { FileNode } from '../types';
import toast from 'react-hot-toast';

export const useFiles = (projectId: string | undefined) => {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setFiles([]);
      setLoading(false);
      return;
    }

    setError(null);
    const q = query(
      collection(db, 'projects', projectId, 'files'),
      orderBy('path')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const filesData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        } as FileNode));
        
        setFiles(filesData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching files:', err);
        setError('ファイルの取得に失敗しました');
        setLoading(false);
        toast.error('ファイルの取得に失敗しました');
      }
    );

    return unsubscribe;
  }, [projectId]);

  const createFile = async (
    name: string, 
    path: string, 
    content: string = '',
    isDirectory: boolean = false
  ) => {
    if (!projectId) {
      throw new Error('プロジェクトIDが指定されていません');
    }

    try {
      const fileData = {
        name,
        path,
        content: isDirectory ? '' : content,
        size: isDirectory ? 0 : new Blob([content]).size,
        mimeType: isDirectory ? 'directory' : getMimeType(name),
        isDirectory,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(
        collection(db, 'projects', projectId, 'files'), 
        fileData
      );
      
      toast.success(isDirectory ? 'フォルダを作成しました' : 'ファイルを作成しました');
      return docRef.id;
    } catch (err) {
      console.error('Error creating file:', err);
      toast.error(isDirectory ? 'フォルダの作成に失敗しました' : 'ファイルの作成に失敗しました');
      throw err;
    }
  };

  const updateFile = async (fileId: string, content: string) => {
    if (!projectId) {
      throw new Error('プロジェクトIDが指定されていません');
    }

    try {
      const fileRef = doc(db, 'projects', projectId, 'files', fileId);
      await updateDoc(fileRef, {
        content,
        size: new Blob([content]).size,
        updatedAt: serverTimestamp()
      });
      
      toast.success('ファイルを更新しました');
    } catch (err) {
      console.error('Error updating file:', err);
      toast.error('ファイルの更新に失敗しました');
      throw err;
    }
  };

  const deleteFile = async (fileId: string) => {
    if (!projectId) {
      throw new Error('プロジェクトIDが指定されていません');
    }

    try {
      await deleteDoc(doc(db, 'projects', projectId, 'files', fileId));
      toast.success('ファイルを削除しました');
    } catch (err) {
      console.error('Error deleting file:', err);
      toast.error('ファイルの削除に失敗しました');
      throw err;
    }
  };

  const getFile = async (fileId: string): Promise<FileNode | null> => {
    if (!projectId) {
      throw new Error('プロジェクトIDが指定されていません');
    }

    try {
      const fileDoc = await getDoc(doc(db, 'projects', projectId, 'files', fileId));
      if (fileDoc.exists()) {
        return {
          id: fileDoc.id,
          ...fileDoc.data(),
          createdAt: fileDoc.data().createdAt?.toDate(),
          updatedAt: fileDoc.data().updatedAt?.toDate()
        } as FileNode;
      }
      return null;
    } catch (err) {
      console.error('Error getting file:', err);
      throw err;
    }
  };

  return {
    files,
    loading,
    error,
    createFile,
    updateFile,
    deleteFile,
    getFile
  };
};

// MIMEタイプを推測する簡単なヘルパー関数
function getMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'txt': 'text/plain',
    'md': 'text/markdown',
    'js': 'text/javascript',
    'jsx': 'text/javascript',
    'ts': 'text/typescript',
    'tsx': 'text/typescript',
    'json': 'application/json',
    'html': 'text/html',
    'css': 'text/css',
    'py': 'text/x-python',
    'java': 'text/x-java',
    'cpp': 'text/x-c++',
    'c': 'text/x-c',
    'go': 'text/x-go',
    'rs': 'text/x-rust',
    'yaml': 'text/yaml',
    'yml': 'text/yaml',
    'xml': 'text/xml',
    'sh': 'text/x-sh',
    'bash': 'text/x-sh'
  };
  
  return mimeTypes[ext || ''] || 'text/plain';
}