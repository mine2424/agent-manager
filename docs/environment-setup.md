# Environment Setup Guide

Complete guide for configuring environment variables for Agent Manager.

## Quick Setup

Run the automated setup script:

```bash
./scripts/setup-env.sh
```

This script will:
- Create `.env` files from templates
- Generate secure random secrets
- Check Firebase configuration
- Optionally install dependencies

## Manual Setup

### 1. Local Bridge Configuration

Create `local-bridge/.env`:

```bash
cp local-bridge/.env.example local-bridge/.env
```

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `CORS_ORIGIN` | Allowed origins | `http://localhost:5173` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Generate with `openssl rand -base64 32` |
| `FIREBASE_SERVICE_ACCOUNT` | Path to service account JSON | `./serviceAccount.json` |

#### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `development` |
| `SESSION_SECRET` | Session secret | Uses JWT_SECRET |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |
| `MAX_EXECUTION_TIME` | Max execution time | `30000` (30 sec) |
| `MAX_OUTPUT_SIZE` | Max output size | `1048576` (1MB) |
| `LOG_LEVEL` | Logging level | `info` |

### 2. Frontend Configuration

Create `frontend/.env.local`:

```bash
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Local Bridge URL
VITE_LOCAL_BRIDGE_URL=http://localhost:3001
```

Find these values in Firebase Console > Project Settings > General > Your apps

### 3. Firebase Service Account

#### Download Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Project Settings** > **Service accounts**
4. Click **Generate new private key**
5. Save as `local-bridge/serviceAccount.json`

#### Alternative: Use Environment Variables

Instead of a service account file, you can use individual credentials:

```bash
# In local-bridge/.env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Environment-Specific Configuration

### Development

```bash
# local-bridge/.env.development
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:5173
LOG_LEVEL=debug
ENABLE_SWAGGER=true
```

### Staging

```bash
# local-bridge/.env.staging
NODE_ENV=staging
PORT=3001
CORS_ORIGIN=https://staging.your-domain.com
LOG_LEVEL=info
ENABLE_RATE_LIMITING=true
```

### Production

```bash
# local-bridge/.env.production
NODE_ENV=production
PORT=3001
CORS_ORIGIN=https://your-domain.com
LOG_LEVEL=warn
ENABLE_RATE_LIMITING=true
ENABLE_AUDIT_LOG=true
```

## Security Best Practices

### 1. Generate Strong Secrets

```bash
# Generate JWT secret
openssl rand -base64 32

# Generate session secret
openssl rand -base64 32
```

### 2. Never Commit Secrets

Add to `.gitignore`:

```gitignore
# Environment files
.env
.env.local
.env.*.local

# Firebase service account
serviceAccount.json
**/serviceAccount.json

# Logs
logs/
*.log
```

### 3. Use Different Secrets Per Environment

- Never reuse secrets between dev/staging/prod
- Rotate secrets regularly
- Use a secret management service in production

### 4. Validate Environment Variables

The application validates required variables on startup:

```typescript
// local-bridge/src/config/index.ts
const requiredEnvVars = [
  'PORT',
  'CORS_ORIGIN',
  'JWT_SECRET',
];

const missingEnvVars = requiredEnvVars.filter(
  varName => !process.env[varName]
);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  process.exit(1);
}
```

## Feature Flags

Control features via environment variables:

```bash
# Enable/disable features
ENABLE_AUDIT_LOG=true
ENABLE_RATE_LIMITING=true
ENABLE_FILE_VALIDATION=true
ENABLE_COMMAND_VALIDATION=true
ENABLE_AUTH_VALIDATION=true
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Firebase Authentication Fails

1. Check service account file exists
2. Verify file has correct permissions: `chmod 600 serviceAccount.json`
3. Ensure project ID matches
4. Check Firebase project has Authentication enabled

### CORS Errors

1. Verify `CORS_ORIGIN` matches frontend URL exactly
2. Include protocol (`http://` or `https://`)
3. No trailing slash
4. For multiple origins, use comma separation

### Environment Variables Not Loading

1. Check `.env` file location
2. Restart the server after changes
3. Verify no syntax errors in `.env`
4. Check for spaces around `=` sign

## Advanced Configuration

### Using dotenv-expand

For variable expansion:

```bash
# Base URL
BASE_URL=http://localhost:3001

# Expand variables
HEALTH_CHECK_URL=${BASE_URL}/health
API_URL=${BASE_URL}/api
```

### Custom Configuration Files

Load environment-specific configs:

```javascript
// config/index.js
import dotenv from 'dotenv';
import path from 'path';

// Load base .env
dotenv.config();

// Load environment-specific .env
const envFile = `.env.${process.env.NODE_ENV}`;
dotenv.config({ path: envFile });
```

### Configuration Validation

Use a schema validator:

```javascript
import Joi from 'joi';

const envSchema = Joi.object({
  PORT: Joi.number().default(3001),
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .default('development'),
  JWT_SECRET: Joi.string().min(32).required(),
  // ... other validations
}).unknown();

const { value: envVars, error } = envSchema.validate(process.env);

if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}
```

## Monitoring Configuration

### Health Check Endpoint

The server provides a health check endpoint:

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "config": {
    "environment": "development",
    "features": {
      "auditLog": true,
      "rateLimiting": true
    }
  }
}
```

### Configuration Logging

On startup, the server logs its configuration:

```
🔧 Configuration:
  - Port: 3001
  - Environment: development
  - CORS Origins: http://localhost:5173
  - Firebase Auth: ✅ Service Account File
  - Claude CLI: claude
  - Rate Limiting: ✅ Enabled
  - Audit Logging: ✅ Enabled
```

## Next Steps

After configuration:

1. **Test the setup**: Run `npm run dev` in both frontend and local-bridge
2. **Verify Firebase**: Check authentication works
3. **Test execution**: Try running a simple command
4. **Monitor logs**: Check `logs/local-bridge.log` for any issues
5. **Set up deployment**: Configure production environment variables