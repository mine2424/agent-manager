# Troubleshooting Guide

## Common Issues

### pnpm dev freezes or doesn't start

This is a known issue with pnpm's parallel execution in some environments. Here are several solutions:

#### Solution 1: Use the development script (Recommended)
```bash
# This uses a custom Node.js script to manage both servers
pnpm dev
```

#### Solution 2: Use the shell script
```bash
# Make it executable first
chmod +x dev.sh

# Run the script
./dev.sh
```

#### Solution 3: Run servers separately
Open two terminal windows:

**Terminal 1 - Frontend:**
```bash
cd frontend
pnpm dev
```

**Terminal 2 - Local Bridge:**
```bash
cd local-bridge
pnpm dev
```

#### Solution 4: Use npm instead of pnpm for development
```bash
# Install dependencies with npm
cd frontend && npm install
cd ../local-bridge && npm install

# Run with npm
cd frontend && npm run dev  # Terminal 1
cd local-bridge && npm run dev  # Terminal 2
```

### Port already in use

If you see an error about port 5173 or 8080 being in use:

1. Find the process using the port:
```bash
# For macOS/Linux
lsof -i :5173  # or :8080
kill -9 <PID>

# For Windows
netstat -ano | findstr :5173  # or :8080
taskkill /PID <PID> /F
```

2. Or change the port in the configuration:
- Frontend: Edit `frontend/vite.config.ts` to change the port
- Local Bridge: Edit `local-bridge/.env` to change PORT

### Firebase Admin SDK initialization error

If you see: `FirebaseAppError: Service account object must contain a string "project_id" property`

1. **Create the .env file:**
```bash
cd local-bridge
cp .env.example .env
```

2. **Download service account key:**
   - Go to Firebase Console > Project settings > Service accounts
   - Click "Generate new private key"
   - Save the JSON file to `local-bridge/serviceAccount.json`

3. **Update .env file:**
```env
FIREBASE_SERVICE_ACCOUNT=./serviceAccount.json
```

4. **Alternative: Use environment variables directly:**
```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-email@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Firebase connection issues

1. **Authentication fails:**
   - Verify GitHub OAuth is enabled in Firebase Console
   - Check that redirect URLs are correctly configured
   - Ensure your domain is authorized in Firebase

2. **Firestore permission denied:**
   - Check Firestore security rules
   - Verify the user is properly authenticated
   - Check if the project ID matches

3. **Service account issues:**
   - Download a new service account key from Firebase Console
   - Update the path in `local-bridge/.env`
   - Ensure the file has proper read permissions

### Module not found errors

1. Clear all node_modules and reinstall:
```bash
pnpm clean
pnpm install
```

2. Clear pnpm store cache:
```bash
pnpm store prune
```

3. Delete lock file and reinstall:
```bash
rm pnpm-lock.yaml
pnpm install
```

### TypeScript errors

1. Restart TypeScript server in your IDE
2. Clear TypeScript cache:
```bash
rm -rf **/tsconfig.tsbuildinfo
```

3. Rebuild the project:
```bash
pnpm build
```

### Socket.IO connection fails

1. **CORS issues:**
   - Check that `VITE_LOCAL_BRIDGE_URL` in frontend/.env matches your local bridge URL
   - Verify CORS is properly configured in local-bridge

2. **Authentication token issues:**
   - Check browser console for token errors
   - Verify Firebase Authentication is working
   - Try logging out and back in

### Claude CLI not found

1. **Verify Claude CLI is installed:**
```bash
which claude  # macOS/Linux
where claude  # Windows
```

2. **Update the path in local-bridge/.env:**
```env
CLAUDE_CLI_PATH=/full/path/to/claude
```

3. **Check PATH environment variable:**
```bash
echo $PATH  # Ensure Claude CLI directory is included
```

### Development server crashes

1. **Check Node.js version:**
```bash
node --version  # Should be 18 or higher
```

2. **Increase memory limit if needed:**
```bash
NODE_OPTIONS="--max-old-space-size=4096" pnpm dev
```

3. **Check for file watching limits (Linux):**
```bash
# Check current limit
cat /proc/sys/fs/inotify/max_user_watches

# Increase if needed
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## Getting Help

If you're still experiencing issues:

1. Check the [GitHub Issues](https://github.com/yourusername/agent-manager/issues)
2. Review the [Documentation](./README.md)
3. Enable debug logging:
   ```bash
   DEBUG=* pnpm dev
   ```

## Debug Commands

```bash
# Check pnpm version
pnpm --version

# Check installed packages
pnpm list

# Check for outdated packages
pnpm outdated

# Verify workspace configuration
pnpm list --recursive --depth 0

# Test individual package scripts
pnpm --filter frontend dev
pnpm --filter local-bridge dev
```