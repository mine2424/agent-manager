# Firebase Setup Guide

## Prerequisites

1. Firebase project created at https://console.firebase.google.com
2. GitHub OAuth App created at https://github.com/settings/developers

## Step 1: Firebase Console Configuration

### 1.1 Enable Authentication

1. Go to Firebase Console > Authentication
2. Click "Get started"
3. Go to "Sign-in method" tab
4. Enable "GitHub" provider
5. Add your GitHub OAuth App credentials:
   - Client ID: `your-github-client-id`
   - Client Secret: `your-github-client-secret`
6. Copy the callback URL and add it to your GitHub OAuth App

### 1.2 Create Firestore Database

1. Go to Firebase Console > Firestore Database
2. Click "Create database"
3. Choose "Start in production mode"
4. Select your region (e.g., us-central1)
5. Click "Enable"

### 1.3 Set Firestore Security Rules

Copy and paste these rules in Firestore > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーは自分のプロジェクトのみアクセス可能
    match /projects/{projectId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      
      // プロジェクト内のファイルへのアクセス
      match /files/{fileId} {
        allow read, write: if request.auth != null && 
          get(/databases/$(database)/documents/projects/$(projectId)).data.userId == request.auth.uid;
      }
    }
    
    // ユーザープロファイル
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 1.4 Create Storage Bucket (Optional)

1. Go to Firebase Console > Storage
2. Click "Get started"
3. Accept the default security rules
4. Select your region
5. Click "Done"

## Step 2: Download Service Account Key

1. Go to Firebase Console > Project settings (gear icon)
2. Go to "Service accounts" tab
3. Click "Generate new private key"
4. Save the JSON file securely
5. Never commit this file to version control!

## Step 3: Configure Frontend

Create `frontend/.env`:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_LOCAL_BRIDGE_URL=http://localhost:8080
```

Find these values in Firebase Console > Project settings > General > Your apps > Web app

## Step 4: Configure Local Bridge

Create `local-bridge/.env`:

```env
PORT=8080
FIREBASE_SERVICE_ACCOUNT=./serviceAccount.json
CLAUDE_CLI_PATH=claude
```

Place your service account JSON file in the local-bridge directory (or adjust the path).

## Step 5: GitHub OAuth Setup

1. Go to https://github.com/settings/developers
2. Click "New OAuth App" or edit existing
3. Fill in:
   - Application name: `Agent Manager`
   - Homepage URL: `http://localhost:5173` (development) or your production URL
   - Authorization callback URL: Copy from Firebase Console (looks like `https://your-project.firebaseapp.com/__/auth/handler`)
4. Save Client ID and Client Secret

## Step 6: Create Firestore Indexes (if needed)

If you see errors about missing indexes, Firebase will provide links in the console to create them automatically.

Common indexes needed:
- `projects` collection: `userId` (Ascending) + `createdAt` (Descending)
- `files` collection: `path` (Ascending)

## Troubleshooting

### Service Account Errors

1. **"Service account object must contain a string 'project_id' property"**
   - Ensure you downloaded the correct service account JSON
   - Check the file path in `.env`
   - Verify the JSON file is valid

2. **Permission Denied**
   - Check Firestore security rules
   - Verify the service account has proper permissions
   - Try regenerating the service account key

### Authentication Errors

1. **GitHub OAuth not working**
   - Verify callback URL matches exactly
   - Check Client ID and Secret are correct
   - Ensure GitHub OAuth is enabled in Firebase

2. **Token verification fails**
   - Check that frontend and backend are using the same Firebase project
   - Verify CORS settings allow your frontend URL

### Connection Issues

1. **Cannot connect to Firestore**
   - Check internet connection
   - Verify project ID is correct
   - Check if Firestore is enabled in your project

2. **Local bridge fails to start**
   - Ensure all environment variables are set
   - Check that the service account file exists
   - Verify Node.js version is 18+

## Security Best Practices

1. **Never commit sensitive files:**
   - `.env` files
   - Service account JSON files
   - Any file with API keys

2. **Use appropriate security rules:**
   - Start with restrictive rules
   - Only allow authenticated users
   - Validate data on both client and server

3. **Rotate credentials regularly:**
   - Service account keys
   - OAuth client secrets
   - API keys

## Next Steps

After completing setup:

1. Run `pnpm install` to install dependencies
2. Run `pnpm dev` to start development servers
3. Visit http://localhost:5173
4. Sign in with GitHub
5. Create your first project!

For production deployment, see [deployment-guide.md](./deployment-guide.md)