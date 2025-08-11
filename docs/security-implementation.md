# Security Implementation Guide

## Overview

This document outlines the security measures implemented in the Agent Manager project to protect against common web vulnerabilities and ensure safe execution of Claude commands.

## Implemented Security Features

### 1. Input Validation

#### Frontend Validation (`frontend/src/utils/validation.ts`)
- **Validation Rules**: Required fields, min/max length, regex patterns, custom validators
- **Validation Schemas**: Pre-defined schemas for projects, files, execution, and users
- **Real-time Feedback**: useValidation hook provides immediate validation feedback
- **Sanitization Functions**:
  - `sanitizeFilePath`: Removes directory traversal attempts and dangerous characters
  - `sanitizeFirestorePath`: Ensures Firestore-compatible paths
  - `escapeHtml`: Prevents XSS attacks
  - `sanitizeProjectName`: Normalizes project names
  - `sanitizeCommand`: Removes null bytes and enforces length limits

#### Backend Validation (`local-bridge/src/middleware/validation.ts`)
- **Zod Schemas**: Type-safe validation for all API endpoints
- **Path Sanitization**: Prevents directory traversal attacks
- **Command Validation**: Detects and blocks dangerous command patterns:
  - System modification commands (`rm -rf /`, `sudo`, `chmod 777`)
  - Code execution (`eval`, `exec`, `system`)
  - Dangerous network operations
  - Environment manipulation
- **File Size Limits**: 10MB maximum file size
- **Socket.io Validation**: Validation middleware for WebSocket events

### 2. Rate Limiting

Implemented in-memory rate limiting to prevent DoS attacks:

```javascript
// General API endpoints
general: {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
}

// Execution endpoints
execution: {
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 executions per minute
}

// File operations
fileOps: {
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 file operations per minute
}
```

### 3. Authentication & Authorization

- **Firebase Authentication**: GitHub OAuth integration
- **Token Validation**: All API requests require valid Firebase ID tokens
- **User Isolation**: Firestore security rules ensure users can only access their own data
- **Service Account**: Backend uses service account for privileged operations

### 4. Error Handling

#### Global Error Boundary (`frontend/src/components/common/ErrorBoundary.tsx`)
- Catches React component errors
- Provides user-friendly error messages
- Offers recovery options
- Logs errors for debugging (development mode)

#### Error Classification System (`frontend/src/utils/errorHandler.ts`)
- **Error Types**: Network, Auth, Validation, Firebase, Execution, Unknown
- **User-Friendly Messages**: Localized error messages in Japanese
- **Recovery Mechanisms**: Retry options for recoverable errors
- **Error Queue**: Prevents error flooding
- **Production Logging**: Ready for integration with error tracking services

### 5. Secure Communication

- **HTTPS**: Required for production deployment
- **WebSocket Security**: Token-based authentication for Socket.io connections
- **CORS Configuration**: Restricted to allowed origins only

## Security Best Practices

### 1. Never Trust User Input
- All user input is validated on both frontend and backend
- Sanitization is applied before processing or storage
- Path traversal attempts are blocked

### 2. Principle of Least Privilege
- Claude executions run with limited permissions
- File operations are restricted to project directories
- No direct system command execution

### 3. Defense in Depth
- Multiple layers of validation
- Rate limiting at application level
- Firebase security rules as additional protection
- Error boundaries to prevent information leakage

### 4. Secure Defaults
- Strict validation rules by default
- Conservative rate limits
- Minimal error information in production

## Configuration

### Environment Variables
```bash
# Frontend
VITE_FIREBASE_API_KEY=<your-api-key>
VITE_FIREBASE_AUTH_DOMAIN=<your-auth-domain>
VITE_FIREBASE_PROJECT_ID=<your-project-id>

# Backend
FIREBASE_SERVICE_ACCOUNT=<path-to-service-account>
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
```

### Firebase Security Rules
```javascript
// Firestore Rules
match /users/{userId}/{document=**} {
  allow read, write: if request.auth != null && request.auth.uid == userId;
}

match /projects/{projectId} {
  allow read, write: if request.auth != null && 
    request.auth.uid == resource.data.userId;
}
```

## Testing Security

### 1. Input Validation Tests
```bash
# Test directory traversal
curl -X POST http://localhost:8080/api/files \
  -H "Authorization: Bearer <token>" \
  -d '{"path": "../../../etc/passwd"}'

# Test command injection
curl -X POST http://localhost:8080/api/execute \
  -H "Authorization: Bearer <token>" \
  -d '{"command": "ls && rm -rf /"}'
```

### 2. Rate Limiting Tests
```bash
# Test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:8080/api/execute \
    -H "Authorization: Bearer <token>" \
    -d '{"command": "echo test"}'
done
```

### 3. Authentication Tests
```bash
# Test without token
curl -X POST http://localhost:8080/api/execute \
  -d '{"command": "ls"}'

# Test with invalid token
curl -X POST http://localhost:8080/api/execute \
  -H "Authorization: Bearer invalid-token" \
  -d '{"command": "ls"}'
```

## Future Enhancements

1. **Content Security Policy (CSP)**
   - Implement strict CSP headers
   - Prevent XSS attacks
   - Control resource loading

2. **Audit Logging**
   - Log all security-relevant events
   - Track failed authentication attempts
   - Monitor rate limit violations

3. **External Security Services**
   - Integrate with Sentry for error tracking
   - Add Web Application Firewall (WAF)
   - Implement DDoS protection at infrastructure level

4. **Security Headers**
   - X-Frame-Options
   - X-Content-Type-Options
   - Strict-Transport-Security

5. **Regular Security Audits**
   - Dependency vulnerability scanning
   - Penetration testing
   - Code security reviews

## Incident Response

In case of a security incident:

1. **Immediate Actions**
   - Disable affected user accounts
   - Review audit logs
   - Patch vulnerability

2. **Investigation**
   - Determine scope of breach
   - Identify affected users
   - Preserve evidence

3. **Recovery**
   - Reset affected credentials
   - Apply security patches
   - Notify affected users

4. **Post-Incident**
   - Document lessons learned
   - Update security procedures
   - Implement additional controls

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/basics)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)