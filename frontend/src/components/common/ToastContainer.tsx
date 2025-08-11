import React from 'react';
import { Toaster } from 'react-hot-toast';
import { useIsMobile } from '../../hooks/useMediaQuery';

export const ToastContainer: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <Toaster
      position={isMobile ? 'top-center' : 'bottom-right'}
      toastOptions={{
        duration: 4000,
        style: {
          background: '#363636',
          color: '#fff',
          padding: '12px 16px',
          borderRadius: '8px',
          fontSize: '14px',
          maxWidth: isMobile ? '90vw' : '400px',
        },
        success: {
          iconTheme: {
            primary: '#10B981',
            secondary: '#fff',
          },
          style: {
            background: '#10B981',
          },
        },
        error: {
          iconTheme: {
            primary: '#EF4444',
            secondary: '#fff',
          },
          style: {
            background: '#EF4444',
          },
        },
      }}
    />
  );
};