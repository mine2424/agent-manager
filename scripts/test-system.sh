#!/bin/bash

# System test script for Agent Manager
# Tests all major components to ensure they're working

set -e

echo "================================================"
echo "  Agent Manager System Test"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -n "Testing $test_name... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "1. Environment Tests"
echo "-------------------"

# Check Node.js version
run_test "Node.js version" "node -v | grep -E 'v(18|19|20|21|22|23|24)'"

# Check npm
run_test "npm availability" "which npm"

# Check environment files
run_test "Frontend env file" "[ -f frontend/.env ] || [ -f frontend/.env.local ]"
run_test "Local-bridge env file" "[ -f local-bridge/.env ]"

echo ""
echo "2. Dependency Tests"
echo "-------------------"

# Check frontend dependencies
run_test "Frontend dependencies" "[ -d frontend/node_modules ]"
run_test "React installed" "[ -d frontend/node_modules/react ]"
run_test "Vite installed" "[ -d frontend/node_modules/vite ]"

# Check backend dependencies
run_test "Backend dependencies" "[ -d local-bridge/node_modules ]"
run_test "Express installed" "[ -d local-bridge/node_modules/express ]"
run_test "Socket.io installed" "[ -d local-bridge/node_modules/socket.io ]"

echo ""
echo "3. Build Tests"
echo "--------------"

# Test frontend build
echo -n "Testing frontend build... "
if cd frontend && npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((TESTS_PASSED++))
    rm -rf dist
else
    echo -e "${RED}❌ FAILED${NC}"
    ((TESTS_FAILED++))
fi
cd ..

# Test backend build
echo -n "Testing backend compilation... "
if cd local-bridge && npx tsc --noEmit > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    echo "  TypeScript errors found. Run 'cd local-bridge && npx tsc --noEmit' for details"
    ((TESTS_FAILED++))
fi
cd ..

echo ""
echo "4. Frontend Tests"
echo "----------------"

# Run frontend tests
echo -n "Running frontend tests... "
if cd frontend && npm test -- --run > /dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    echo "  Run 'cd frontend && npm test' for details"
    ((TESTS_FAILED++))
fi
cd ..

echo ""
echo "5. Service Tests"
echo "---------------"

# Check if services are running
if lsof -Pi :3001 -sTCP:LISTEN -t > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Local Bridge is running on port 3001${NC}"
    ((TESTS_PASSED++))
    
    # Test health endpoint
    echo -n "Testing health endpoint... "
    if curl -s http://localhost:3001/health | grep -q '"status":"ok"'; then
        echo -e "${GREEN}✅ PASSED${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED${NC}"
        ((TESTS_FAILED++))
    fi
else
    echo -e "${YELLOW}⚠️  Local Bridge is not running${NC}"
    echo "  Run './scripts/start-dev.sh' to start services"
fi

if lsof -Pi :5173 -sTCP:LISTEN -t > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Frontend is running on port 5173${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${YELLOW}⚠️  Frontend is not running${NC}"
    echo "  Run './scripts/start-dev.sh' to start services"
fi

echo ""
echo "6. Firebase Configuration"
echo "------------------------"

# Check Firebase service account
if [ -f "local-bridge/serviceAccount.json" ]; then
    echo -e "${GREEN}✅ Firebase service account found${NC}"
    ((TESTS_PASSED++))
    
    # Check if it's valid JSON
    if python3 -m json.tool local-bridge/serviceAccount.json > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Service account is valid JSON${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ Service account JSON is invalid${NC}"
        ((TESTS_FAILED++))
    fi
else
    # Check for environment variables
    if grep -q "FIREBASE_PROJECT_ID=" local-bridge/.env 2>/dev/null; then
        echo -e "${YELLOW}⚠️  Using Firebase environment variables${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ No Firebase configuration found${NC}"
        echo "  Download service account from Firebase Console"
        ((TESTS_FAILED++))
    fi
fi

echo ""
echo "7. Security Tests"
echo "----------------"

# Check for secure secrets
echo -n "Checking JWT secret strength... "
if [ -f "local-bridge/.env" ]; then
    JWT_LENGTH=$(grep "JWT_SECRET=" local-bridge/.env | cut -d'=' -f2 | wc -c)
    if [ $JWT_LENGTH -ge 32 ]; then
        echo -e "${GREEN}✅ PASSED (≥32 chars)${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}❌ FAILED (too short)${NC}"
        echo "  JWT_SECRET should be at least 32 characters"
        ((TESTS_FAILED++))
    fi
fi

# Check .gitignore
echo -n "Checking .gitignore for sensitive files... "
if grep -q "serviceAccount.json" .gitignore && grep -q ".env" .gitignore; then
    echo -e "${GREEN}✅ PASSED${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAILED${NC}"
    echo "  Ensure .env and serviceAccount.json are in .gitignore"
    ((TESTS_FAILED++))
fi

echo ""
echo "8. Directory Structure"
echo "---------------------"

# Check required directories
run_test "Logs directory" "[ -d local-bridge/logs ] || mkdir -p local-bridge/logs"
run_test "Temp directory" "[ -d local-bridge/temp ] || mkdir -p local-bridge/temp"

echo ""
echo "================================================"
echo "  Test Results"
echo "================================================"
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed! System is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run './scripts/start-dev.sh' to start the application"
    echo "2. Open http://localhost:5173 in your browser"
    echo "3. Sign in with GitHub"
    exit 0
else
    echo -e "${RED}⚠️  Some tests failed. Please fix the issues above.${NC}"
    echo ""
    echo "For help, see:"
    echo "- docs/quick-start.md"
    echo "- docs/troubleshooting.md"
    exit 1
fi