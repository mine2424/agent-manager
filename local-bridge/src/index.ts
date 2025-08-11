import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

// ESモジュールでの__dirname取得
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration (loads .env automatically)
import { config } from './config/index.js';

// Firebase Admin SDKの初期化を先に行う
import { initializeFirebaseAdmin, getFirebaseApp } from './config/firebase.js';

// Initialize Firebase at startup
try {
  const firebaseApp = initializeFirebaseAdmin();
  console.log('🔥 Firebase initialized successfully');
} catch (error) {
  console.error('⚠️  Firebase initialization failed:', error);
  console.log('   Continuing without Firebase authentication...');
}

import { authMiddleware } from './middleware/auth.js';
import { setupSocketHandlers } from './handlers/socketHandlers.js';
import { rateLimit, rateLimits } from './middleware/validation.js';
import auditRoutes from './routes/audit.js';
import { auditLogger } from './services/auditLogger.js';
import { performanceMonitor } from './services/performanceMonitor.js';

const app = express();
const httpServer = createServer(app);

// Security headers with CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", "https://firebaseapp.com", "https://*.firebaseio.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permittedCrossDomainPolicies: false
}));

// CORS設定
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply general rate limiting
app.use(rateLimit(rateLimits.general));

// Track requests for performance monitoring
app.use((req, res, next) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  performanceMonitor.trackRequest(requestId, req.method, req.path);
  
  res.on('finish', () => {
    performanceMonitor.completeRequest(requestId, res.statusCode);
  });
  
  next();
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  const health = performanceMonitor.getHealthStatus();
  const metrics = performanceMonitor.getMetrics();
  
  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json({ 
    status: health.status,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    issues: health.issues,
    metrics: {
      cpu: `${metrics.cpu.usage.toFixed(2)}%`,
      memory: `${metrics.memory.percentage.toFixed(2)}%`,
      activeConnections: metrics.api.activeConnections,
      activeExecutions: metrics.execution.activeExecutions,
      uptime: process.uptime()
    }
  });
});

// Performance metrics endpoint
app.get('/metrics', (req, res) => {
  const metrics = performanceMonitor.getMetrics();
  const history = performanceMonitor.getMetricsHistory();
  
  res.json({
    current: metrics,
    history: history.slice(-20), // Last 20 data points
    health: performanceMonitor.getHealthStatus()
  });
});

// Audit routes
app.use('/api/audit', auditRoutes);

// API routes with specific rate limiting
app.post('/api/execute', rateLimit(rateLimits.execution), (req, res) => {
  // This endpoint is primarily handled via WebSocket
  res.status(400).json({ 
    error: 'Please use WebSocket connection for execution',
    code: 'USE_WEBSOCKET'
  });
});

app.post('/api/files/*', rateLimit(rateLimits.fileOps), (req, res) => {
  // This endpoint is primarily handled via WebSocket
  res.status(400).json({ 
    error: 'Please use WebSocket connection for file operations',
    code: 'USE_WEBSOCKET'
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Express error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Socket.IOの設定
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.cors.origin,
    credentials: config.cors.credentials
  },
  pingTimeout: config.socketIo.pingTimeout,
  pingInterval: config.socketIo.pingInterval
});

// Socket.IO認証ミドルウェア
io.use(authMiddleware);

// Socketハンドラーの設定
setupSocketHandlers(io);

// サーバー起動
const PORT = config.server.port;

// 設定の確認
console.log('\n🔧 Configuration:');
console.log(`  - Port: ${PORT}`);
console.log(`  - Environment: ${config.server.nodeEnv}`);
console.log(`  - CORS Origins: ${config.cors.origin.join(', ')}`);

// Firebase設定の確認
if (config.firebase.serviceAccountPath) {
  console.log(`  - Firebase Auth: ✅ Service Account File`);
} else if (config.firebase.projectId && config.firebase.clientEmail && config.firebase.privateKey) {
  console.log(`  - Firebase Auth: ✅ Environment Variables`);
  console.log(`  - Project ID: ${config.firebase.projectId}`);
} else {
  console.log(`  - Firebase Auth: ⚠️  Using default credentials`);
}

console.log(`  - Claude CLI: ${config.claude.cliPath}`);
console.log(`  - Rate Limiting: ${config.features.rateLimiting ? '✅ Enabled' : '❌ Disabled'}`);
console.log(`  - Audit Logging: ${config.features.auditLog ? '✅ Enabled' : '❌ Disabled'}\n`);

httpServer.listen(PORT, () => {
  console.log(`🚀 Local Bridge Server is running on http://localhost:${PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/health`);
  
  // Firebaseが環境変数で設定されていない場合のみ警告を表示
  if (!config.firebase.serviceAccountPath && (!config.firebase.projectId || !config.firebase.clientEmail || !config.firebase.privateKey)) {
    console.log('\n⚠️  Firebase configuration:');
    console.log('   You can either use a service account file OR environment variables.');
    console.log('   See docs/firebase-setup.md for details.\n');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  
  // Close audit logger
  auditLogger.close();
  
  // Close HTTP server
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, closing server...');
  
  // Close audit logger
  auditLogger.close();
  
  // Close HTTP server
  httpServer.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});