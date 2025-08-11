import { useEffect, useState } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Project } from '../types';
import toast from 'react-hot-toast';
import { withErrorHandling, useErrorHandler } from '../utils/errorHandler';

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const handleError = useErrorHandler();

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setLoading(false);
      return;
    }

    setError(null);
    const q = query(
      collection(db, 'projects'),
      where('userId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const projectsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        } as Project));
        
        setProjects(projectsData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching projects:', err);
        setError('プロジェクトの取得に失敗しました');
        setLoading(false);
        handleError(err);
      }
    );

    return unsubscribe;
  }, [user]);

  const createProject = async (name: string, description: string = '') => {
    if (!user) {
      throw new Error('ユーザーが認証されていません');
    }

    return await withErrorHandling(
      async () => {
        const projectData = {
          userId: user.uid,
          name,
          description,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'projects'), projectData);
        toast.success('プロジェクトを作成しました');
        return docRef.id;
      },
      {
        errorMessage: 'プロジェクトの作成に失敗しました'
      }
    );
  };

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    return await withErrorHandling(
      async () => {
        const projectRef = doc(db, 'projects', projectId);
        await updateDoc(projectRef, {
          ...updates,
          updatedAt: serverTimestamp()
        });
        toast.success('プロジェクトを更新しました');
      },
      {
        errorMessage: 'プロジェクトの更新に失敗しました'
      }
    );
  };

  const deleteProject = async (projectId: string) => {
    return await withErrorHandling(
      async () => {
        await deleteDoc(doc(db, 'projects', projectId));
        toast.success('プロジェクトを削除しました');
      },
      {
        errorMessage: 'プロジェクトの削除に失敗しました'
      }
    );
  };

  return {
    projects,
    loading,
    error,
    createProject,
    updateProject,
    deleteProject
  };
};