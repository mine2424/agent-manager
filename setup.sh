#!/bin/bash

# Agent Manager Setup Script
# This script helps you set up the Agent Manager project quickly

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_info() {
    echo -e "${GREEN}[i]${NC} $1"
}

# ASCII Art Header
echo -e "${GREEN}"
echo "     _                    _     __  __                                   "
echo "    / \   __ _  ___ _ __ | |_  |  \/  | __ _ _ __   __ _  __ _  ___ _ __"
echo "   / _ \ / _\` |/ _ \ '_ \| __| | |\/| |/ _\` | '_ \ / _\` |/ _\` |/ _ \ '__|"
echo "  / ___ \ (_| |  __/ | | | |_  | |  | | (_| | | | | (_| | (_| |  __/ |   "
echo " /_/   \_\__, |\___|_| |_|\__| |_|  |_|\__,_|_| |_|\__,_|\__, |\___|_|   "
echo "         |___/                                            |___/           "
echo -e "${NC}"
echo "Welcome to Agent Manager Setup!"
echo "==============================="
echo

# Check Node.js version
check_node() {
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed. Please install Node.js 18 or later."
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js version 18 or later is required. Current version: $(node -v)"
        exit 1
    fi
    
    print_status "Node.js $(node -v) is installed"
}

# Check npm/pnpm
check_package_manager() {
    if command -v pnpm &> /dev/null; then
        PACKAGE_MANAGER="pnpm"
        print_status "Using pnpm"
    elif command -v npm &> /dev/null; then
        PACKAGE_MANAGER="npm"
        print_status "Using npm"
    else
        print_error "No package manager found. Please install npm or pnpm."
        exit 1
    fi
}

# Check Claude CLI
check_claude_cli() {
    if ! command -v claude &> /dev/null; then
        print_warning "Claude CLI is not installed or not in PATH"
        echo "Please ensure Claude CLI is installed for full functionality."
        echo "Visit: https://docs.anthropic.com/claude/docs/claude-cli"
        echo
    else
        print_status "Claude CLI is installed"
    fi
}

# Check Firebase CLI
check_firebase_cli() {
    if ! command -v firebase &> /dev/null; then
        print_warning "Firebase CLI is not installed"
        read -p "Would you like to install Firebase CLI? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            npm install -g firebase-tools
            print_status "Firebase CLI installed"
        fi
    else
        print_status "Firebase CLI is installed"
    fi
}

# Create environment files
create_env_files() {
    print_info "Creating environment files..."
    
    # Frontend .env
    if [ ! -f "frontend/.env" ]; then
        cat > frontend/.env << EOF
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

# Local Bridge URL
VITE_LOCAL_BRIDGE_URL=http://localhost:8080

# Feature Flags
VITE_ENABLE_VIBE_CODING=true
EOF
        print_status "Created frontend/.env"
    else
        print_info "frontend/.env already exists"
    fi
    
    # Local Bridge .env
    if [ ! -f "local-bridge/.env" ]; then
        cp local-bridge/.env.example local-bridge/.env
        print_status "Created local-bridge/.env from example"
    else
        print_info "local-bridge/.env already exists"
    fi
}

# Install dependencies
install_dependencies() {
    print_info "Installing dependencies..."
    
    # Root dependencies (if using workspace)
    if [ -f "pnpm-workspace.yaml" ] || [ -f "package.json" ]; then
        $PACKAGE_MANAGER install
    fi
    
    # Frontend dependencies
    print_info "Installing frontend dependencies..."
    cd frontend
    $PACKAGE_MANAGER install
    cd ..
    
    # Local Bridge dependencies
    print_info "Installing local-bridge dependencies..."
    cd local-bridge
    $PACKAGE_MANAGER install
    cd ..
    
    print_status "All dependencies installed"
}

# Setup Firebase
setup_firebase() {
    print_info "Firebase Setup"
    echo "Please ensure you have:"
    echo "1. Created a Firebase project"
    echo "2. Enabled GitHub authentication"
    echo "3. Created Firestore database"
    echo "4. Enabled Storage"
    echo
    read -p "Have you completed these steps? (y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Please update the Firebase configuration in:"
        echo "  - frontend/.env"
        echo "  - local-bridge/.env"
        echo
        read -p "Press any key to continue..." -n 1 -r
        echo
    else
        print_warning "Please complete Firebase setup before running the application"
        echo "Guide: docs/firebase-setup.md"
    fi
}

# Create necessary directories
create_directories() {
    print_info "Creating necessary directories..."
    
    # Local bridge directories
    mkdir -p local-bridge/temp
    mkdir -p local-bridge/logs
    
    print_status "Directories created"
}

# Display next steps
show_next_steps() {
    echo
    echo "========================================="
    echo "Setup Complete! 🎉"
    echo "========================================="
    echo
    echo "Next steps:"
    echo "1. Update Firebase configuration in .env files"
    echo "2. Start the development servers:"
    echo
    echo "   # Terminal 1 - Frontend"
    echo "   cd frontend"
    echo "   $PACKAGE_MANAGER run dev"
    echo
    echo "   # Terminal 2 - Local Bridge"
    echo "   cd local-bridge"
    echo "   $PACKAGE_MANAGER run dev"
    echo
    echo "3. Open http://localhost:5173 in your browser"
    echo
    echo "For more information:"
    echo "- Setup Guide: docs/development-guide.md"
    echo "- Troubleshooting: docs/troubleshooting.md"
    echo
}

# Development mode setup
setup_dev_mode() {
    print_info "Setting up development mode..."
    
    # Create dev script
    cat > dev.sh << 'EOF'
#!/bin/bash
# Development startup script

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Starting Agent Manager in development mode...${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}Stopping all services...${NC}"
    kill $(jobs -p) 2>/dev/null
    exit
}

trap cleanup EXIT INT TERM

# Start frontend
echo -e "${GREEN}Starting frontend...${NC}"
(cd frontend && npm run dev) &

# Wait a bit for frontend to start
sleep 3

# Start local bridge
echo -e "${GREEN}Starting local bridge...${NC}"
(cd local-bridge && npm run dev) &

# Wait for services to be ready
sleep 5

echo -e "${GREEN}Agent Manager is running!${NC}"
echo "Frontend: http://localhost:5173"
echo "Local Bridge: http://localhost:8080"
echo
echo "Press Ctrl+C to stop all services"

# Wait for background processes
wait
EOF
    
    chmod +x dev.sh
    print_status "Created dev.sh script"
}

# Main execution
main() {
    echo "Checking prerequisites..."
    check_node
    check_package_manager
    check_claude_cli
    check_firebase_cli
    
    echo
    echo "Setting up project..."
    create_env_files
    create_directories
    install_dependencies
    setup_dev_mode
    
    echo
    setup_firebase
    
    show_next_steps
}

# Run main function
main