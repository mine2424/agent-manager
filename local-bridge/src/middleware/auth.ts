import { Socket } from 'socket.io';
import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { getFirebaseApp } from '../config/firebase.js';

// Socket.io authentication middleware
export const authMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication token is required'));
    }

    // Firebase IDトークンの検証
    try {
      // Ensure Firebase is initialized before using it
      const app = getFirebaseApp();
      const decodedToken = await admin.auth(app).verifyIdToken(token);
      
      // ユーザー情報をsocketに追加
      (socket as any).userId = decodedToken.uid;
      (socket as any).userEmail = decodedToken.email;
      
      console.log(`✅ User authenticated: ${decodedToken.email}`);
      next();
    } catch (verifyError) {
      console.error('❌ Token verification error:', verifyError);
      if (verifyError instanceof Error) {
        console.error('Verify error details:', {
          name: verifyError.name,
          message: verifyError.message,
          code: (verifyError as any).code
        });
      }
      throw verifyError;
    }
  } catch (error) {
    console.error('❌ Authentication failed:', error);
    if (error instanceof Error) {
      console.error('Auth error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    next(new Error('Authentication failed: ' + (error instanceof Error ? error.message : 'Unknown error')));
  }
};

// Express authentication middleware
export const expressAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Authentication token is required',
        code: 'AUTH_REQUIRED'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    try {
      // Ensure Firebase is initialized before using it
      const app = getFirebaseApp();
      const decodedToken = await admin.auth(app).verifyIdToken(token);
      
      // Add user info to request
      (req as any).userId = decodedToken.uid;
      (req as any).userEmail = decodedToken.email;
      
      next();
    } catch (verifyError) {
      console.error('Token verification error:', verifyError);
      return res.status(401).json({
        error: 'Invalid authentication token',
        code: 'INVALID_TOKEN'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication error',
      code: 'AUTH_ERROR'
    });
  }
};