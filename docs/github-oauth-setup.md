# GitHub OAuth Setup Guide

## 1. Create GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Fill in the following:

### Application Settings

- **Application name**: `Agent Manager` (or your preferred name)
- **Homepage URL**: 
  - Development: `http://localhost:5173`
  - Production: `https://your-domain.com`
- **Application description**: `Cloud-based Claude Code Manager` (optional)
- **Authorization callback URL**: 
  - Copy from Firebase Console (Authentication > Sign-in method > GitHub)
  - Usually: `https://YOUR-PROJECT-ID.firebaseapp.com/__/auth/handler`
  - Example: `https://agent-manager-9e720.firebaseapp.com/__/auth/handler`

### Important Notes

⚠️ **The Authorization callback URL must match EXACTLY what Firebase provides**
- No trailing slashes
- Must use `https://` (not `http://`)
- Case sensitive

## 2. Configure Firebase

1. Go to Firebase Console > Authentication > Sign-in method
2. Click on GitHub provider
3. Enable it
4. Enter:
   - **Client ID**: From GitHub OAuth App
   - **Client Secret**: From GitHub OAuth App
5. Copy the **authorization callback URL** shown
6. Save

## 3. Common Issues

### "redirect_uri is not associated with this application"

This means the callback URL in GitHub doesn't match Firebase's expectation.

**Solution:**
1. Copy the exact URL from Firebase Console
2. Paste it into GitHub OAuth App settings
3. Make sure there are no extra spaces or characters
4. Save and try again

### "This app hasn't been verified by GitHub"

This is normal for development. Users can still authorize the app.

### Multiple Environments

If you need both development and production:

1. Create separate OAuth Apps on GitHub:
   - `Agent Manager (Development)`
   - `Agent Manager (Production)`

2. Or use Firebase's staging project feature

## 4. Security Best Practices

1. **Never commit OAuth secrets** to version control
2. **Rotate secrets regularly**
3. **Use environment-specific apps** for development/staging/production
4. **Limit OAuth scopes** to only what's needed (Firebase handles this)

## 5. Testing

After setup:
1. Go to http://localhost:5173
2. Click "Sign in with GitHub"
3. You should see GitHub's authorization page
4. After authorizing, you should be redirected back to your app

## 6. Debugging

Enable Firebase Auth debug mode:
```javascript
// In your browser console
localStorage.debug = 'firebase:auth*'
```

Check network tab for:
- Redirect URL being used
- Any error responses from GitHub or Firebase