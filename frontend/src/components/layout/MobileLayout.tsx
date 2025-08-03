import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const isProjectDetail = location.pathname.includes('/projects/') && location.pathname !== '/projects';

  const handleSignOut = async () => {
    await signOut();
    setShowMenu(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            {isProjectDetail && (
              <button
                onClick={() => navigate('/projects')}
                className="mr-3 text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-semibold text-gray-900">Agent Manager</h1>
          </div>
          
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 text-gray-600"
          >
            {showMenu ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* ドロップダウンメニュー */}
        {showMenu && (
          <div className="absolute right-0 top-full w-48 bg-white shadow-lg rounded-b-lg">
            <div className="p-4 border-b">
              {user?.photoURL && (
                <img
                  className="w-10 h-10 rounded-full mb-2"
                  src={user.photoURL}
                  alt={user.displayName || 'User'}
                />
              )}
              <p className="text-sm font-medium text-gray-900">
                {user?.displayName || user?.email}
              </p>
            </div>
            
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-100"
            >
              ログアウト
            </button>
          </div>
        )}
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};