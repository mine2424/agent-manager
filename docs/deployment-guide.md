# Agent Manager - Deployment Guide

## Overview

This guide covers deployment options for Agent Manager, from development to production environments. The system supports multiple deployment strategies including Firebase Hosting, Docker containers, and cloud platforms.

## Prerequisites

### Required Services
- [Firebase Project](https://console.firebase.google.com)
- [GitHub OAuth App](https://github.com/settings/applications/new)
- Node.js 18+ environment
- Domain name (for production)

### Required Credentials
- Firebase service account key
- GitHub OAuth client ID and secret
- Claude API access (anthropic.com)

## Development Deployment

### Quick Start
```bash
# Clone and setup
git clone https://github.com/yourusername/agent-manager.git
cd agent-manager

# Automated setup
./scripts/setup-env.sh

# Start development servers
./scripts/start-dev.sh
```

### Manual Setup
1. **Install dependencies:**
```bash
pnpm install
# or
npm run install:all
```

2. **Configure environment variables:**
```bash
# Frontend (.env)
cp frontend/.env.example frontend/.env
# Edit with your Firebase config

# Local Bridge (.env)
cp local-bridge/.env.example local-bridge/.env
# Add your service account path
```

3. **Start services:**
```bash
# Terminal 1 - Frontend
cd frontend && npm run dev

# Terminal 2 - Local Bridge  
cd local-bridge && npm run dev
```

## Production Deployment

### Option 1: Firebase Hosting + Cloud Run

#### Step 1: Prepare Firebase Project
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login and init
firebase login
firebase init hosting
firebase init functions  # if using Cloud Functions
```

#### Step 2: Build Frontend
```bash
cd frontend
npm run build

# Test build locally
npm run preview
```

#### Step 3: Configure Firebase Hosting
```json
// firebase.json
{
  "hosting": {
    "public": "frontend/dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "/api/**",
        "run": {
          "serviceId": "agent-manager-bridge",
          "region": "us-central1"
        }
      },
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

#### Step 4: Deploy Backend to Cloud Run
```bash
# Create Dockerfile for local-bridge
cat > local-bridge/Dockerfile << 'EOF'
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 8080
CMD ["npm", "start"]
EOF

# Build and deploy
cd local-bridge
gcloud run deploy agent-manager-bridge \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080
```

#### Step 5: Deploy Frontend
```bash
# Deploy to Firebase Hosting
firebase deploy --only hosting
```

### Option 2: Docker Deployment

#### Docker Compose Setup
```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: 
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8080
      - VITE_FIREBASE_API_KEY=${FIREBASE_API_KEY}
      - VITE_FIREBASE_AUTH_DOMAIN=${FIREBASE_AUTH_DOMAIN}
      - VITE_FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
    depends_on:
      - backend

  backend:
    build:
      context: ./local-bridge
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - PORT=8080
      - FIREBASE_SERVICE_ACCOUNT=/app/serviceAccount.json
      - CLAUDE_CLI_PATH=claude
    volumes:
      - ./serviceAccount.json:/app/serviceAccount.json:ro
      - ./temp:/app/temp

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - frontend
      - backend
```

#### Frontend Dockerfile
```dockerfile
# frontend/Dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
```

#### Backend Dockerfile
```dockerfile
# local-bridge/Dockerfile
FROM node:18-alpine
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create temp directory
RUN mkdir -p temp

EXPOSE 8080
CMD ["npm", "start"]
```

#### Deploy with Docker
```bash
# Build and start
docker-compose up -d

# Check logs
docker-compose logs -f

# Scale services
docker-compose up -d --scale backend=3
```

### Option 3: AWS/GCP/Azure Deployment

#### AWS App Runner
```yaml
# apprunner.yaml
version: 1.0
runtime: nodejs18
build:
  commands:
    build:
      - npm ci
      - npm run build
run:
  runtime-version: 18
  command: npm start
  network:
    port: 8080
  env:
    - name: NODE_ENV
      value: production
```

#### Google Cloud Run
```yaml
# cloudbuild.yaml
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/agent-manager-backend', './local-bridge']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/agent-manager-backend']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - run
      - deploy
      - agent-manager-backend
      - --image=gcr.io/$PROJECT_ID/agent-manager-backend
      - --region=us-central1
      - --platform=managed
      - --allow-unauthenticated
```

## Environment Configuration

### Production Environment Variables

#### Frontend (.env.production)
```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_production_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# API Configuration
VITE_LOCAL_BRIDGE_URL=https://your-api-domain.com
VITE_APP_ENV=production
VITE_ENABLE_ANALYTICS=true

# Feature Flags
VITE_ENABLE_SPEC_GENERATION=true
VITE_ENABLE_COLLABORATION=true
VITE_ENABLE_MOBILE_FEATURES=true
```

#### Backend (.env.production)
```env
# Server Configuration
NODE_ENV=production
PORT=8080
CORS_ORIGIN=https://your-domain.com

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project
FIREBASE_SERVICE_ACCOUNT=/app/serviceAccount.json

# Claude Configuration
CLAUDE_CLI_PATH=/usr/local/bin/claude
CLAUDE_TIMEOUT=300000

# Security Configuration
JWT_SECRET=your-jwt-secret
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
AUDIT_LOG_RETENTION_DAYS=90

# Performance
MAX_FILE_SIZE=10485760
MAX_PROJECT_SIZE=1073741824
EXECUTION_TIMEOUT=300000
```

## SSL/TLS Configuration

### Let's Encrypt with Certbot
```bash
# Install certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet" | sudo crontab -
```

### Nginx SSL Configuration
```nginx
# nginx.conf
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy "strict-origin-when-cross-origin";

    # Frontend
    location / {
        proxy_pass http://frontend:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # API
    location /api/ {
        proxy_pass http://backend:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket
    location /socket.io/ {
        proxy_pass http://backend:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}

# HTTP to HTTPS redirect
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

## Database Migration & Backup

### Firestore Backup
```bash
# Install Firebase tools
npm install -g firebase-tools

# Export data
firebase firestore:export gs://your-backup-bucket/backup-$(date +%Y%m%d)

# Schedule automated backups
gcloud scheduler jobs create app-engine backup-firestore \
    --schedule="0 2 * * *" \
    --relative-url="/backup" \
    --http-method=POST
```

### Data Migration Script
```javascript
// scripts/migrate.js
const admin = require('firebase-admin');

async function migrateData() {
  const db = admin.firestore();
  
  // Example: Add new field to all projects
  const projects = await db.collection('projects').get();
  
  const batch = db.batch();
  projects.docs.forEach(doc => {
    batch.update(doc.ref, {
      version: '2.0',
      migratedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
  
  await batch.commit();
  console.log('Migration completed');
}

migrateData().catch(console.error);
```

## Monitoring & Logging

### Health Checks
```javascript
// health-check.js
const express = require('express');
const app = express();

app.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'ok',
      claude: 'ok',
      storage: 'ok'
    }
  };

  try {
    // Check Firebase connection
    await admin.firestore().collection('health').doc('test').get();
    
    // Check Claude CLI
    const { exec } = require('child_process');
    exec('claude --version', (error) => {
      if (error) health.services.claude = 'error';
    });

    res.json(health);
  } catch (error) {
    health.status = 'error';
    health.error = error.message;
    res.status(500).json(health);
  }
});

app.listen(8080);
```

### Log Aggregation
```yaml
# docker-compose.logging.yml
version: '3.8'

services:
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.5.0
    environment:
      - discovery.type=single-node
      - xpack.security.enabled=false
    ports:
      - "9200:9200"

  kibana:
    image: docker.elastic.co/kibana/kibana:8.5.0
    ports:
      - "5601:5601"
    environment:
      - ELASTICSEARCH_HOSTS=http://elasticsearch:9200

  logstash:
    image: docker.elastic.co/logstash/logstash:8.5.0
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    ports:
      - "5044:5044"
```

## Performance Optimization

### CDN Configuration
```javascript
// Frontend build optimization
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@monaco-editor/react', 'react-markdown'],
          utils: ['socket.io-client', 'firebase/app']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

### Caching Strategy
```nginx
# Static assets caching
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# API caching
location /api/projects {
    proxy_pass http://backend:8080;
    proxy_cache_valid 200 5m;
    add_header X-Cache-Status $upstream_cache_status;
}
```

## Security Checklist

### Pre-Deployment Security
- [ ] Environment variables secured
- [ ] Service account permissions minimal
- [ ] Firestore security rules tested
- [ ] CORS configured properly
- [ ] Rate limiting enabled
- [ ] Input validation active
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Dependency vulnerabilities checked
- [ ] Secrets not in repository

### Post-Deployment Security
- [ ] SSL certificate valid
- [ ] Security headers verified
- [ ] API endpoints tested
- [ ] Authentication flow tested  
- [ ] Rate limiting verified
- [ ] Logs monitoring configured
- [ ] Backup system working
- [ ] Incident response plan ready

## Troubleshooting

### Common Issues

#### 1. Firebase Connection Issues
```bash
# Check service account permissions
gcloud projects get-iam-policy YOUR_PROJECT_ID

# Verify service account key
firebase auth:test serviceAccount.json
```

#### 2. Claude CLI Issues
```bash
# Check Claude installation
which claude
claude --version

# Check authentication
claude auth status

# Reset authentication  
claude auth logout
claude auth login
```

#### 3. Build Failures
```bash
# Clear caches
rm -rf node_modules package-lock.json
npm install

# Check Node.js version
node --version  # Should be 18+

# Enable verbose logging
npm run build --verbose
```

#### 4. Performance Issues
```bash
# Check bundle size
npm run build
npm run analyze

# Monitor memory usage
NODE_OPTIONS="--max-old-space-size=4096" npm start

# Profile performance
npm run dev -- --profile
```

### Log Analysis
```bash
# Filter error logs
docker-compose logs backend | grep ERROR

# Monitor real-time logs
tail -f /var/log/agent-manager/app.log

# Check specific time range
journalctl --since "1 hour ago" --until "30 minutes ago"
```

## Rollback Procedures

### Quick Rollback
```bash
# Rollback Firebase hosting
firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION TARGET_SITE_ID

# Rollback Cloud Run
gcloud run services replace-traffic agent-manager-backend \
    --to-revisions=PREVIOUS_REVISION=100

# Rollback Docker deployment
docker-compose down
docker-compose up -d --scale backend=0
docker tag PREVIOUS_IMAGE:TAG CURRENT_IMAGE:TAG  
docker-compose up -d
```

### Database Rollback
```bash
# Restore Firestore backup
firebase firestore:delete --all-collections --force
firebase firestore:restore gs://your-backup-bucket/backup-YYYYMMDD
```

## Support & Maintenance

### Maintenance Schedule
- **Daily**: Health checks, log review
- **Weekly**: Security updates, performance review  
- **Monthly**: Dependency updates, backup verification
- **Quarterly**: Security audit, disaster recovery test

### Support Contacts
- **Technical Issues**: Create GitHub issue
- **Security Issues**: security@yourdomain.com
- **Deployment Help**: Check troubleshooting guide

---

*Last Updated: 2025-08-10*
*Guide Version: 1.0*