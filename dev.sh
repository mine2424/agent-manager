#!/bin/bash

# Start development servers
echo "🚀 Starting Agent Manager development servers..."
echo ""

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please run: npm install -g pnpm"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ] || [ ! -d "frontend/node_modules" ] || [ ! -d "local-bridge/node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $FRONTEND_PID $BRIDGE_PID 2>/dev/null
    exit
}

trap cleanup INT TERM

# Start frontend
echo "🌐 Starting frontend on http://localhost:5173"
cd frontend && pnpm dev &
FRONTEND_PID=$!

# Start local bridge
echo "🔌 Starting local bridge on http://localhost:8080"
cd ../local-bridge && pnpm dev &
BRIDGE_PID=$!

echo ""
echo "✅ Both servers are starting..."
echo "Press Ctrl+C to stop"
echo ""

# Wait for both processes
wait