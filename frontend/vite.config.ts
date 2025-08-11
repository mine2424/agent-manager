import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: [
      'firebase/app',
      'firebase/auth', 
      'firebase/firestore',
      'firebase/storage'
    ],
    exclude: []
  },
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    headers: {
      'Content-Security-Policy': process.env.NODE_ENV === 'development' 
        ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' ws: wss: http://localhost:* https://*.firebaseapp.com https://*.firebaseio.com;"
        : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' wss: https://*.firebaseapp.com https://*.firebaseio.com;",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          editor: ['@monaco-editor/react'],
          ui: ['react-hot-toast', 'lucide-react', 'react-markdown']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
