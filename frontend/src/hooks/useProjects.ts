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

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

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
        toast.error('プロジェクトの取得に失敗しました');
      }
    );

    return unsubscribe;
  }, [user]);

  const createProject = async (name: string, description: string = '') => {
    if (!user) {
      throw new Error('ユーザーが認証されていません');
    }

    try {
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
    } catch (err) {
      console.error('Error creating project:', err);
      toast.error('プロジェクトの作成に失敗しました');
      throw err;
    }
  };

  const updateProject = async (projectId: string, updates: Partial<Project>) => {
    try {
      const projectRef = doc(db, 'projects', projectId);
      await updateDoc(projectRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      toast.success('プロジェクトを更新しました');
    } catch (err) {
      console.error('Error updating project:', err);
      toast.error('プロジェクトの更新に失敗しました');
      throw err;
    }
  };

  const deleteProject = async (projectId: string) => {
    try {
      await deleteDoc(doc(db, 'projects', projectId));
      toast.success('プロジェクトを削除しました');
    } catch (err) {
      console.error('Error deleting project:', err);
      toast.error('プロジェクトの削除に失敗しました');
      throw err;
    }
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