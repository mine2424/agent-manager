import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth.js';
import { setupSocketHandlers } from './handlers/socketHandlers.js';

// 環境変数の読み込み
dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS設定
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Socket.IOの設定
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Socket.IO認証ミドルウェア
io.use(authMiddleware);

// Socketハンドラーの設定
setupSocketHandlers(io);

// サーバー起動
const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`🚀 Local Bridge Server is running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
});