import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';

// ESモジュールでの__dirname取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// .envファイルを読み込み
config({ path: path.join(__dirname, '../../.env') });

// Firebase Admin SDKの初期化
let firebaseInitialized = false;

export function initializeFirebaseAdmin() {
  // Already initialized - return existing app
  if (admin.apps.length > 0 || firebaseInitialized) {
    return admin.app();
  }

  try {
    // サービスアカウントファイルから読み込む場合
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT);
      
      try {
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        
        const app = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID
        });
        
        firebaseInitialized = true;
        console.log('✅ Firebase Admin SDK initialized with service account file');
        console.log(`   Project ID: ${serviceAccount.project_id || process.env.FIREBASE_PROJECT_ID}`);
        return app;
      } catch (fileError) {
        console.error('❌ Failed to read service account file:', fileError);
        throw fileError;
      }
    } 
    // 環境変数から直接読み込む場合
    else if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
      // private keyの正しいフォーマットを確保
      let privateKey = process.env.FIREBASE_PRIVATE_KEY;
      
      // エスケープされた改行文字を実際の改行に変換
      privateKey = privateKey.replace(/\\n/g, '\n');
      
      // 先頭と末尾の引用符を削除（もしあれば）
      privateKey = privateKey.replace(/^["']|["']$/g, '');
      
      const app = admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey
        }),
        projectId: process.env.FIREBASE_PROJECT_ID
      });
      
      firebaseInitialized = true;
      console.log('✅ Firebase Admin SDK initialized with environment variables');
      console.log(`   Project ID: ${process.env.FIREBASE_PROJECT_ID}`);
      return app;
    } 
    // デフォルト認証を試す（Google Cloud環境）
    else {
      const app = admin.initializeApp();
      firebaseInitialized = true;
      console.log('✅ Firebase Admin SDK initialized with default credentials');
      return app;
    }
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        code: (error as any).code,
        stack: error.stack
      });
    }
    throw error;
  }
}

// Initialize Firebase and export the app instance
let firebaseAppInstance: admin.app.App | null = null;

try {
  firebaseAppInstance = initializeFirebaseAdmin();
} catch (error) {
  console.error('⚠️  Firebase initialization failed at module load:', error);
  // Don't throw here - let the auth middleware handle the error
}

export const firebaseApp = firebaseAppInstance;

// Helper function to get Firebase app with proper error handling
export function getFirebaseApp(): admin.app.App {
  if (!firebaseAppInstance) {
    // Try to initialize again
    try {
      firebaseAppInstance = initializeFirebaseAdmin();
    } catch (error) {
      throw new Error('Firebase Admin SDK is not initialized. Please check your configuration.');
    }
  }
  return firebaseAppInstance;
}