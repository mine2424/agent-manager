# Agent Manager - Quick Start Guide

## Prerequisites

Before starting, ensure you have:

- Node.js 18+ installed
- npm or pnpm installed
- Firebase account created
- GitHub account (for OAuth)

## Quick Setup (5 minutes)

### 1. Clone and Install

```bash
# Clone the repository
git clone <repository-url>
cd agent-manager

# Run automated setup
./scripts/setup-env.sh

# Or manually install dependencies
cd frontend && npm install && cd ..
cd local-bridge && npm install && cd ..
```

### 2. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
2. Enable Authentication (GitHub provider)
3. Create Firestore database
4. Download service account key:
   - Go to Project Settings > Service Accounts
   - Click "Generate new private key"
   - Save as `local-bridge/serviceAccount.json`

### 3. Configure Environment Variables

#### Frontend Configuration
Edit `frontend/.env.local`:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_LOCAL_BRIDGE_URL=http://localhost:3001
```

Find these values in Firebase Console > Project Settings > General

#### Local Bridge Configuration
Edit `local-bridge/.env`:

```env
PORT=3001
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=your-secret-key-minimum-32-chars
FIREBASE_SERVICE_ACCOUNT=./serviceAccount.json
```

### 4. Start the Application

```bash
# Terminal 1: Start frontend
cd frontend
npm run dev
# Opens at http://localhost:5173

# Terminal 2: Start local bridge
cd local-bridge
npm run dev
# Runs at http://localhost:3001
```

## Verify Setup

### 1. Check Health Endpoint

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "ok",
  "version": "1.0.0",
  "timestamp": "2024-01-15T..."
}
```

### 2. Check Frontend

1. Open http://localhost:5173
2. You should see the login page
3. Click "Sign in with GitHub"
4. After authentication, you'll see the dashboard

### 3. Test Core Features

#### Create a Project
1. Click "新しいプロジェクト" (New Project)
2. Enter project name and description
3. Click "作成" (Create)

#### Add Files
1. Open a project
2. Click "新しいファイル" (New File)
3. Enter file name and content
4. Click "作成" (Create)

#### Execute Commands
1. In the project, go to "実行" (Execute) tab
2. Enter a command (e.g., `ls -la`)
3. Click "実行" (Execute)
4. View the output in real-time

### 4. Check Audit Logs

The system now includes comprehensive audit logging:

```bash
# View recent audit logs (requires authentication)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/audit/recent

# Check audit statistics
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/audit/stats
```

Audit logs track:
- User authentication (login/logout)
- Project operations (create/update/delete)
- File operations
- Command executions
- Security events

## Common Issues

### 1. Firebase Authentication Error

**Problem**: "Firebase configuration missing" error

**Solution**:
- Verify `serviceAccount.json` exists in `local-bridge/`
- Check file permissions: `chmod 600 serviceAccount.json`
- Ensure Firebase project has Authentication enabled

### 2. CORS Error

**Problem**: Cross-origin request blocked

**Solution**:
- Check `CORS_ORIGIN` in `local-bridge/.env` matches frontend URL
- Ensure no trailing slashes in URLs
- Restart the local-bridge server

### 3. Connection Failed

**Problem**: Cannot connect to local bridge

**Solution**:
- Verify local-bridge is running on port 3001
- Check `VITE_LOCAL_BRIDGE_URL` in frontend `.env.local`
- Check firewall settings

### 4. GitHub OAuth Error

**Problem**: "Redirect URI mismatch" 

**Solution**:
- Copy callback URL from Firebase Console
- Update GitHub OAuth app settings
- Ensure URLs match exactly (no trailing slashes)

## Project Structure

```
agent-manager/
├── frontend/           # React + TypeScript frontend
│   ├── src/
│   │   ├── components/ # UI components
│   │   ├── contexts/   # React contexts
│   │   ├── hooks/      # Custom hooks
│   │   ├── pages/      # Page components
│   │   ├── services/   # API services
│   │   └── utils/      # Utilities
│   └── .env.local      # Frontend config
│
├── local-bridge/       # Node.js backend
│   ├── src/
│   │   ├── config/     # Configuration
│   │   ├── handlers/   # Socket handlers
│   │   ├── middleware/ # Express middleware
│   │   ├── routes/     # API routes
│   │   └── services/   # Business logic
│   ├── .env           # Backend config
│   └── serviceAccount.json
│
├── docs/              # Documentation
├── scripts/           # Setup scripts
└── tests/            # E2E tests
```

## Features Overview

### Current Features ✅
- GitHub OAuth authentication
- Project management (CRUD)
- File management
- Command execution via Claude CLI
- Real-time output streaming
- Input validation & sanitization
- Rate limiting
- Audit logging
- Error handling
- Mobile responsive UI

### Security Features 🔒
- Firebase Authentication
- JWT token validation
- Input sanitization
- Command validation
- Rate limiting
- Audit logging
- CORS protection
- XSS prevention

### Monitoring 📊
- Health check endpoint
- Audit log tracking
- Error logging
- Performance metrics (coming soon)

## Development Commands

```bash
# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build

# Run with debug logging
LOG_LEVEL=debug npm run dev

# Check audit logs
tail -f local-bridge/logs/audit-*.log
```

## Next Steps

1. **Production Deployment**:
   - See [deployment-guide.md](./deployment-guide.md)

2. **Advanced Configuration**:
   - See [environment-setup.md](./environment-setup.md)

3. **Security Hardening**:
   - See [security-implementation.md](./security-implementation.md)

4. **API Documentation**:
   - See [api-specification.md](./api-specification.md)

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review logs in `local-bridge/logs/`
3. Check browser console for frontend errors
4. Review server console output

## License

[Your License Here]