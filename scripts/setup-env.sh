#!/bin/bash

# Local Bridge Environment Setup Script
# This script helps configure the local-bridge environment variables

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
LOCAL_BRIDGE_DIR="$PROJECT_ROOT/local-bridge"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "================================================"
echo "  Agent Manager - Environment Setup"
echo "================================================"
echo ""

# Check if .env files already exist
check_env_files() {
    local has_files=false
    
    if [ -f "$LOCAL_BRIDGE_DIR/.env" ]; then
        echo "✅ Found: local-bridge/.env"
        has_files=true
    else
        echo "❌ Missing: local-bridge/.env"
    fi
    
    if [ -f "$FRONTEND_DIR/.env" ] || [ -f "$FRONTEND_DIR/.env.local" ]; then
        echo "✅ Found: frontend/.env or .env.local"
        has_files=true
    else
        echo "❌ Missing: frontend/.env"
    fi
    
    if [ "$has_files" = true ]; then
        echo ""
        read -p "Environment files already exist. Do you want to overwrite them? (y/N): " -n 1 -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Keeping existing configuration."
            exit 0
        fi
    fi
}

# Create local-bridge .env file
setup_local_bridge_env() {
    echo ""
    echo "Setting up local-bridge environment..."
    echo "---------------------------------------"
    
    # Copy from example if it exists
    if [ -f "$LOCAL_BRIDGE_DIR/.env.example" ]; then
        cp "$LOCAL_BRIDGE_DIR/.env.example" "$LOCAL_BRIDGE_DIR/.env"
        echo "✅ Created local-bridge/.env from .env.example"
    else
        # Create basic .env file
        cat > "$LOCAL_BRIDGE_DIR/.env" << 'EOF'
# Server Configuration
PORT=3001
NODE_ENV=development

# Firebase Admin SDK Configuration
# Option 1: Use service account file (recommended)
FIREBASE_SERVICE_ACCOUNT=./serviceAccount.json

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Security Configuration
JWT_SECRET=change-this-secret-in-production-minimum-32-chars
SESSION_SECRET=change-this-session-secret-in-production

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Execution Configuration
MAX_EXECUTION_TIME=30000
MAX_OUTPUT_SIZE=1048576
MAX_CONCURRENT_EXECUTIONS=5
EXECUTION_TIMEOUT_MS=30000

# Claude CLI Configuration
CLAUDE_CLI_PATH=claude

# File Management
MAX_FILE_SIZE=10485760
ALLOWED_FILE_EXTENSIONS=.js,.ts,.jsx,.tsx,.json,.md,.txt,.yaml,.yml,.css,.html,.py,.java,.go,.rs,.cpp,.c,.h,.sh,.sql
TEMP_DIR=/tmp/agent-manager

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/local-bridge.log
LOG_MAX_FILES=5
LOG_MAX_SIZE=10m

# Socket.io Configuration
SOCKET_PING_TIMEOUT=5000
SOCKET_PING_INTERVAL=25000

# Feature Flags
ENABLE_AUDIT_LOG=true
ENABLE_RATE_LIMITING=true
ENABLE_FILE_VALIDATION=true
ENABLE_COMMAND_VALIDATION=true
ENABLE_AUTH_VALIDATION=true
EOF
        echo "✅ Created local-bridge/.env with default values"
    fi
    
    echo ""
    echo "⚠️  IMPORTANT: You need to:"
    echo "   1. Download your Firebase service account key"
    echo "   2. Save it as: $LOCAL_BRIDGE_DIR/serviceAccount.json"
    echo "   3. Update JWT_SECRET and SESSION_SECRET with secure values"
}

# Create frontend .env file
setup_frontend_env() {
    echo ""
    echo "Setting up frontend environment..."
    echo "----------------------------------"
    
    cat > "$FRONTEND_DIR/.env.local" << 'EOF'
# Firebase Configuration
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id

# Local Bridge Configuration
VITE_LOCAL_BRIDGE_URL=http://localhost:3001

# Optional: Analytics
# VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
EOF
    
    echo "✅ Created frontend/.env.local with template values"
    echo ""
    echo "⚠️  IMPORTANT: Update the Firebase configuration values"
    echo "   You can find these in Firebase Console > Project Settings"
}

# Generate secure secrets
generate_secrets() {
    echo ""
    read -p "Do you want to generate secure random secrets? (Y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        # Generate random secrets
        JWT_SECRET=$(openssl rand -base64 32)
        SESSION_SECRET=$(openssl rand -base64 32)
        
        # Update the .env file
        if [ -f "$LOCAL_BRIDGE_DIR/.env" ]; then
            # Use different sed syntax for macOS vs Linux
            if [[ "$OSTYPE" == "darwin"* ]]; then
                sed -i '' "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" "$LOCAL_BRIDGE_DIR/.env"
                sed -i '' "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" "$LOCAL_BRIDGE_DIR/.env"
            else
                sed -i "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" "$LOCAL_BRIDGE_DIR/.env"
                sed -i "s/SESSION_SECRET=.*/SESSION_SECRET=$SESSION_SECRET/" "$LOCAL_BRIDGE_DIR/.env"
            fi
            echo "✅ Generated and updated secure secrets"
        fi
    fi
}

# Check Firebase service account
check_firebase_setup() {
    echo ""
    echo "Checking Firebase setup..."
    echo "--------------------------"
    
    if [ -f "$LOCAL_BRIDGE_DIR/serviceAccount.json" ]; then
        echo "✅ Found Firebase service account file"
        
        # Extract project ID if jq is available
        if command -v jq &> /dev/null; then
            PROJECT_ID=$(jq -r '.project_id' "$LOCAL_BRIDGE_DIR/serviceAccount.json" 2>/dev/null)
            if [ ! -z "$PROJECT_ID" ]; then
                echo "   Project ID: $PROJECT_ID"
            fi
        fi
    else
        echo "❌ Firebase service account file not found"
        echo ""
        echo "To set up Firebase:"
        echo "1. Go to Firebase Console > Project Settings > Service Accounts"
        echo "2. Click 'Generate new private key'"
        echo "3. Save the file as: $LOCAL_BRIDGE_DIR/serviceAccount.json"
    fi
}

# Install dependencies
install_dependencies() {
    echo ""
    read -p "Do you want to install npm dependencies? (Y/n): " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        echo "Installing dependencies..."
        
        # Install frontend dependencies
        echo "Installing frontend dependencies..."
        cd "$FRONTEND_DIR"
        npm install
        
        # Install local-bridge dependencies
        echo "Installing local-bridge dependencies..."
        cd "$LOCAL_BRIDGE_DIR"
        npm install
        
        echo "✅ Dependencies installed"
    fi
}

# Main execution
main() {
    check_env_files
    setup_local_bridge_env
    setup_frontend_env
    generate_secrets
    check_firebase_setup
    install_dependencies
    
    echo ""
    echo "================================================"
    echo "  Setup Complete!"
    echo "================================================"
    echo ""
    echo "Next steps:"
    echo "1. Update Firebase configuration in frontend/.env.local"
    echo "2. Add Firebase service account to local-bridge/serviceAccount.json"
    echo "3. Start the development servers:"
    echo "   - Frontend: cd frontend && npm run dev"
    echo "   - Local Bridge: cd local-bridge && npm run dev"
    echo ""
    echo "For more details, see:"
    echo "  - docs/firebase-setup.md"
    echo "  - docs/github-oauth-setup.md"
    echo ""
}

# Run main function
main