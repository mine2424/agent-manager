import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const DashboardPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // ダッシュボードからプロジェクト一覧にリダイレクト
    navigate('/projects', { replace: true });
  }, [navigate]);

  return null;
};