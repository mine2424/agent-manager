#!/bin/bash

# Status check script for Agent Manager
# Shows current system status and configuration

echo "================================================"
echo "  Agent Manager Status Check"
echo "  $(date)"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# System Information
echo -e "${BLUE}System Information${NC}"
echo "-------------------"
echo "Node.js: $(node -v)"
echo "npm: $(npm -v)"
echo "OS: $(uname -s) $(uname -r)"
echo ""

# Service Status
echo -e "${BLUE}Service Status${NC}"
echo "--------------"

# Check Frontend
if lsof -Pi :5173 -sTCP:LISTEN -t > /dev/null 2>&1; then
    echo -e "Frontend:     ${GREEN}● Running${NC} (http://localhost:5173)"
else
    echo -e "Frontend:     ${RED}○ Stopped${NC}"
fi

# Check Local Bridge
PORT=$(grep "^PORT=" local-bridge/.env 2>/dev/null | cut -d'=' -f2 || echo "3001")
if lsof -Pi :$PORT -sTCP:LISTEN -t > /dev/null 2>&1; then
    echo -e "Local Bridge: ${GREEN}● Running${NC} (http://localhost:$PORT)"
    
    # Test health endpoint
    if curl -s http://localhost:$PORT/health > /dev/null 2>&1; then
        HEALTH=$(curl -s http://localhost:$PORT/health | python3 -c "import sys, json; print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "unknown")
        echo -e "Health Check: ${GREEN}✓ $HEALTH${NC}"
    fi
else
    echo -e "Local Bridge: ${RED}○ Stopped${NC}"
fi
echo ""

# Configuration Status
echo -e "${BLUE}Configuration${NC}"
echo "-------------"

# Frontend config
if [ -f "frontend/.env" ] || [ -f "frontend/.env.local" ]; then
    echo -e "Frontend ENV: ${GREEN}✓ Configured${NC}"
    if [ -f "frontend/.env.local" ]; then
        FIREBASE_PROJECT=$(grep "VITE_FIREBASE_PROJECT_ID=" frontend/.env.local | cut -d'=' -f2)
        if [ ! -z "$FIREBASE_PROJECT" ]; then
            echo "  Firebase Project: $FIREBASE_PROJECT"
        fi
    fi
else
    echo -e "Frontend ENV: ${RED}✗ Missing${NC}"
fi

# Backend config
if [ -f "local-bridge/.env" ]; then
    echo -e "Backend ENV:  ${GREEN}✓ Configured${NC}"
    PORT=$(grep "^PORT=" local-bridge/.env | cut -d'=' -f2)
    CORS=$(grep "^CORS_ORIGIN=" local-bridge/.env | cut -d'=' -f2)
    echo "  Port: $PORT"
    echo "  CORS: $CORS"
else
    echo -e "Backend ENV:  ${RED}✗ Missing${NC}"
fi

# Firebase config
if [ -f "local-bridge/serviceAccount.json" ]; then
    echo -e "Firebase:     ${GREEN}✓ Service Account${NC}"
    PROJECT_ID=$(python3 -c "import json; print(json.load(open('local-bridge/serviceAccount.json'))['project_id'])" 2>/dev/null || echo "unknown")
    echo "  Project ID: $PROJECT_ID"
elif grep -q "FIREBASE_PROJECT_ID=" local-bridge/.env 2>/dev/null; then
    echo -e "Firebase:     ${YELLOW}⚠ Environment Variables${NC}"
else
    echo -e "Firebase:     ${RED}✗ Not Configured${NC}"
fi
echo ""

# Dependencies Status
echo -e "${BLUE}Dependencies${NC}"
echo "------------"

# Frontend dependencies
if [ -d "frontend/node_modules" ]; then
    FRONTEND_PACKAGES=$(ls frontend/node_modules | wc -l)
    echo -e "Frontend:     ${GREEN}✓ Installed${NC} ($FRONTEND_PACKAGES packages)"
else
    echo -e "Frontend:     ${RED}✗ Not Installed${NC}"
fi

# Backend dependencies
if [ -d "local-bridge/node_modules" ]; then
    BACKEND_PACKAGES=$(ls local-bridge/node_modules | wc -l)
    echo -e "Backend:      ${GREEN}✓ Installed${NC} ($BACKEND_PACKAGES packages)"
else
    echo -e "Backend:      ${RED}✗ Not Installed${NC}"
fi
echo ""

# Test Status
echo -e "${BLUE}Test Status${NC}"
echo "-----------"

# Frontend tests
echo -n "Frontend Tests: "
if cd frontend && npm test -- --run > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Passing${NC}"
else
    echo -e "${RED}✗ Failing${NC}"
fi
cd .. 2>/dev/null

# Check TypeScript compilation
echo -n "TypeScript:     "
if cd local-bridge && npx tsc --noEmit > /dev/null 2>&1; then
    echo -e "${GREEN}✓ No Errors${NC}"
else
    echo -e "${YELLOW}⚠ Has Errors${NC}"
fi
cd .. 2>/dev/null
echo ""

# Audit Logs
echo -e "${BLUE}Audit Logs${NC}"
echo "----------"
if [ -d "local-bridge/logs" ]; then
    LOG_COUNT=$(ls -1 local-bridge/logs/audit-*.log 2>/dev/null | wc -l)
    if [ $LOG_COUNT -gt 0 ]; then
        LATEST_LOG=$(ls -t local-bridge/logs/audit-*.log 2>/dev/null | head -1)
        LOG_SIZE=$(du -h "$LATEST_LOG" | cut -f1)
        echo -e "Log Files:    ${GREEN}✓ $LOG_COUNT files${NC}"
        echo "Latest:       $(basename $LATEST_LOG) ($LOG_SIZE)"
        
        # Show last few audit entries if available
        if [ -f "$LATEST_LOG" ]; then
            echo ""
            echo "Recent Events:"
            tail -3 "$LATEST_LOG" | while IFS= read -r line; do
                if [ ! -z "$line" ]; then
                    EVENT_TYPE=$(echo "$line" | python3 -c "import sys, json; print(json.loads(sys.stdin.read())['eventType'])" 2>/dev/null || echo "UNKNOWN")
                    TIMESTAMP=$(echo "$line" | python3 -c "import sys, json; print(json.loads(sys.stdin.read())['timestamp'][:19])" 2>/dev/null || echo "")
                    echo "  - $TIMESTAMP: $EVENT_TYPE"
                fi
            done
        fi
    else
        echo -e "Log Files:    ${YELLOW}○ No logs yet${NC}"
    fi
else
    echo -e "Log Directory: ${RED}✗ Missing${NC}"
fi
echo ""

# Quick Actions
echo -e "${BLUE}Quick Actions${NC}"
echo "-------------"
echo "Start Services:  ./scripts/start-dev.sh"
echo "Run Tests:       ./scripts/test-system.sh"
echo "Setup Env:       ./scripts/setup-env.sh"
echo "View Logs:       tail -f local-bridge/logs/audit-*.log"
echo ""

# Summary
echo "================================================"
READY=true

if ! ([ -f "frontend/.env" ] || [ -f "frontend/.env.local" ]) || [ ! -f "local-bridge/.env" ]; then
    READY=false
fi

if [ ! -d "frontend/node_modules" ] || [ ! -d "local-bridge/node_modules" ]; then
    READY=false
fi

if [ "$READY" = true ]; then
    PORT=$(grep "^PORT=" local-bridge/.env 2>/dev/null | cut -d'=' -f2 || echo "3001")
if lsof -Pi :5173 -sTCP:LISTEN -t > /dev/null 2>&1 && lsof -Pi :$PORT -sTCP:LISTEN -t > /dev/null 2>&1; then
        echo -e "${GREEN}✅ System is running and ready!${NC}"
        echo "   Open http://localhost:5173 to access the application"
    else
        echo -e "${YELLOW}⚠️  System is configured but not running${NC}"
        echo "   Run: ./scripts/start-dev.sh"
    fi
else
    echo -e "${RED}⚠️  System setup incomplete${NC}"
    echo "   Run: ./scripts/setup-env.sh"
fi
echo "================================================"