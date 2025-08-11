import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = [
  'PORT',
  'CORS_ORIGIN',
  'JWT_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please create a .env file based on .env.example');
  process.exit(1);
}

// Firebase configuration validation
const hasServiceAccountFile = process.env.FIREBASE_SERVICE_ACCOUNT;
const hasIndividualCreds = process.env.FIREBASE_PROJECT_ID && 
                           process.env.FIREBASE_CLIENT_EMAIL && 
                           process.env.FIREBASE_PRIVATE_KEY;

if (!hasServiceAccountFile && !hasIndividualCreds) {
  console.error('Firebase configuration missing!');
  console.error('Either provide FIREBASE_SERVICE_ACCOUNT path or individual Firebase credentials');
  process.exit(1);
}

export const config = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    isDevelopment: process.env.NODE_ENV !== 'production',
    isProduction: process.env.NODE_ENV === 'production',
  },

  // Firebase Configuration
  firebase: {
    serviceAccountPath: process.env.FIREBASE_SERVICE_ACCOUNT,
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },

  // CORS Configuration
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:5173'],
    credentials: true,
  },

  // Security Configuration
  security: {
    jwtSecret: process.env.JWT_SECRET!,
    sessionSecret: process.env.SESSION_SECRET || process.env.JWT_SECRET!,
    bcryptRounds: 10,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Execution Configuration
  execution: {
    maxExecutionTime: parseInt(process.env.MAX_EXECUTION_TIME || '30000', 10),
    maxOutputSize: parseInt(process.env.MAX_OUTPUT_SIZE || '1048576', 10),
    maxConcurrentExecutions: parseInt(process.env.MAX_CONCURRENT_EXECUTIONS || '5', 10),
    timeoutMs: parseInt(process.env.EXECUTION_TIMEOUT_MS || '30000', 10),
  },

  // Claude Configuration
  claude: {
    cliPath: process.env.CLAUDE_CLI_PATH || 'claude',
    apiKey: process.env.CLAUDE_API_KEY,
  },

  // File Management
  files: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedExtensions: (process.env.ALLOWED_FILE_EXTENSIONS || '.js,.ts,.jsx,.tsx,.json,.md,.txt,.yaml,.yml,.css,.html,.py,.java,.go,.rs,.cpp,.c,.h,.sh,.sql').split(','),
    tempDir: process.env.TEMP_DIR || path.join(__dirname, '../../temp'),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs/local-bridge.log',
    maxFiles: process.env.LOG_MAX_FILES || '5',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
  },

  // Socket.io Configuration
  socketIo: {
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT || '5000', 10),
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL || '25000', 10),
  },

  // Feature Flags
  features: {
    auditLog: process.env.ENABLE_AUDIT_LOG === 'true',
    rateLimiting: process.env.ENABLE_RATE_LIMITING === 'true',
    fileValidation: process.env.ENABLE_FILE_VALIDATION === 'true',
    commandValidation: process.env.ENABLE_COMMAND_VALIDATION === 'true',
    authValidation: process.env.ENABLE_AUTH_VALIDATION === 'true',
  },
};

// Export type for config
export type Config = typeof config;