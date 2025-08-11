#!/bin/bash

# Development startup script for Agent Manager
# This script starts both frontend and backend services

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "================================================"
echo "  Starting Agent Manager Development Server"
echo "================================================"
echo ""

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ is required (current: $(node -v))"
    exit 1
fi
echo "✅ Node.js version: $(node -v)"

# Check if environment files exist
check_env_files() {
    local all_good=true
    
    echo ""
    echo "Checking environment configuration..."
    echo "-------------------------------------"
    
    if [ ! -f "$PROJECT_ROOT/local-bridge/.env" ]; then
        echo "❌ Missing: local-bridge/.env"
        echo "   Run: ./scripts/setup-env.sh"
        all_good=false
    else
        echo "✅ Found: local-bridge/.env"
    fi
    
    if [ ! -f "$PROJECT_ROOT/frontend/.env" ] && [ ! -f "$PROJECT_ROOT/frontend/.env.local" ]; then
        echo "❌ Missing: frontend/.env or .env.local"
        echo "   Run: ./scripts/setup-env.sh"
        all_good=false
    else
        echo "✅ Found: frontend environment config"
    fi
    
    if [ ! -f "$PROJECT_ROOT/local-bridge/serviceAccount.json" ]; then
        echo "⚠️  Missing: local-bridge/serviceAccount.json"
        echo "   Download from Firebase Console > Project Settings > Service Accounts"
        echo "   The app will use environment variables if configured"
    fi
    
    if [ "$all_good" = false ]; then
        echo ""
        echo "❌ Environment setup incomplete. Please run:"
        echo "   ./scripts/setup-env.sh"
        exit 1
    fi
}

# Check dependencies
check_dependencies() {
    echo ""
    echo "Checking dependencies..."
    echo "------------------------"
    
    # Check frontend dependencies
    if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
        echo "📦 Installing frontend dependencies..."
        cd "$PROJECT_ROOT/frontend"
        npm install
    else
        echo "✅ Frontend dependencies installed"
    fi
    
    # Check local-bridge dependencies
    if [ ! -d "$PROJECT_ROOT/local-bridge/node_modules" ]; then
        echo "📦 Installing local-bridge dependencies..."
        cd "$PROJECT_ROOT/local-bridge"
        npm install
    else
        echo "✅ Local-bridge dependencies installed"
    fi
}

# Create necessary directories
create_directories() {
    echo ""
    echo "Creating necessary directories..."
    echo "---------------------------------"
    
    # Create logs directory
    mkdir -p "$PROJECT_ROOT/local-bridge/logs"
    echo "✅ Logs directory ready"
    
    # Create temp directory
    mkdir -p "$PROJECT_ROOT/local-bridge/temp"
    echo "✅ Temp directory ready"
}

# Start services
start_services() {
    echo ""
    echo "Starting services..."
    echo "-------------------"
    
    # Kill any existing processes on our ports
    echo "Checking for existing processes..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
    lsof -ti:5173 | xargs kill -9 2>/dev/null || true
    
    # Start local-bridge in background
    echo ""
    echo "🚀 Starting Local Bridge Server..."
    cd "$PROJECT_ROOT/local-bridge"
    npm run dev &
    BRIDGE_PID=$!
    echo "   PID: $BRIDGE_PID"
    
    # Wait for local-bridge to start
    echo "   Waiting for server to start..."
    sleep 3
    
    # Check if local-bridge is running
    if ! kill -0 $BRIDGE_PID 2>/dev/null; then
        echo "❌ Local Bridge failed to start"
        echo "   Check logs in: local-bridge/logs/"
        exit 1
    fi
    
    # Test health endpoint
    if command -v curl &> /dev/null; then
        if curl -s http://localhost:3001/health | grep -q "ok"; then
            echo "   ✅ Local Bridge is healthy"
        else
            echo "   ⚠️  Local Bridge health check failed"
        fi
    fi
    
    # Start frontend
    echo ""
    echo "🚀 Starting Frontend Development Server..."
    cd "$PROJECT_ROOT/frontend"
    npm run dev &
    FRONTEND_PID=$!
    echo "   PID: $FRONTEND_PID"
    
    # Wait for frontend to start
    echo "   Waiting for frontend to start..."
    sleep 5
    
    # Display access information
    echo ""
    echo "================================================"
    echo "  ✅ Agent Manager is running!"
    echo "================================================"
    echo ""
    echo "📱 Frontend:      http://localhost:5173"
    echo "🔌 Local Bridge:  http://localhost:3001"
    echo "🏥 Health Check:  http://localhost:3001/health"
    echo "📊 Audit Logs:    local-bridge/logs/audit-*.log"
    echo ""
    echo "Press Ctrl+C to stop all services"
    echo "================================================"
    echo ""
    
    # Function to cleanup on exit
    cleanup() {
        echo ""
        echo "Shutting down services..."
        kill $BRIDGE_PID 2>/dev/null || true
        kill $FRONTEND_PID 2>/dev/null || true
        echo "Services stopped"
        exit 0
    }
    
    # Set trap for cleanup
    trap cleanup SIGINT SIGTERM
    
    # Keep script running
    while true; do
        # Check if processes are still running
        if ! kill -0 $BRIDGE_PID 2>/dev/null; then
            echo "⚠️  Local Bridge stopped unexpectedly"
            cleanup
        fi
        if ! kill -0 $FRONTEND_PID 2>/dev/null; then
            echo "⚠️  Frontend stopped unexpectedly"
            cleanup
        fi
        sleep 5
    done
}

# Main execution
main() {
    check_env_files
    check_dependencies
    create_directories
    start_services
}

# Run main function
main