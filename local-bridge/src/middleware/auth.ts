import { Socket } from 'socket.io';
import admin from 'firebase-admin';

// Firebase Admin SDKの初期化
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
    })
  });
}

export const authMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token is required'));
    }

    // Firebase IDトークンの検証
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    // ユーザー情報をsocketに追加
    (socket as any).userId = decodedToken.uid;
    (socket as any).userEmail = decodedToken.email;
    
    console.log(`✅ User authenticated: ${decodedToken.email}`);
    next();
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    next(new Error('Authentication failed'));
  }
};