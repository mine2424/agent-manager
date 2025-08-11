# Changelog

All notable changes to the Agent Manager project will be documented in this file.

## [Unreleased] - 2025-08-09

### Added
- **Security Enhancements**
  - Global error handling with ErrorBoundary component
  - Comprehensive input validation on frontend and backend
  - Rate limiting middleware for DoS protection
  - Path sanitization to prevent directory traversal
  - Command validation to block dangerous operations
  - Zod schema validation for backend endpoints

- **Developer Experience**
  - setup.sh script for easy project initialization
  - Automatic detection of package manager
  - Environment file templates with clear instructions

- **Error Handling**
  - Error classification system (Network, Auth, Validation, Firebase, Execution)
  - User-friendly error messages in Japanese
  - Error recovery mechanisms
  - Development vs production error display

- **Validation Features**
  - Frontend validation utilities with React hooks
  - Validation patterns for emails, URLs, project names, file names
  - Sanitization functions for various input types
  - Real-time validation feedback in forms

- **Documentation**
  - Issue-driven development specification
  - AI prompt optimization specification
  - Context management specification (CLAUDE.md)
  - Development workflow automation specification
  - Advanced security specification
  - Performance monitoring specification

### Modified
- Enhanced CreateProjectModal with input validation
- Enhanced CreateFileModal with input validation
- Enhanced ExecutionPanel with command validation
- Updated project dependencies (added lucide-react, zod)
- Improved error handling in useProjects hook

### Security
- Added rate limiting: General API (100 req/15min), Execution (5 req/min), File ops (30 req/min)
- Implemented comprehensive input sanitization
- Added dangerous command pattern detection
- File size limits enforced (10MB)

## Phase 4 Completion - 2025-08-03

### Added
- File synchronization between local execution and cloud storage
- SHA-256 hash-based change detection
- Mobile optimization features:
  - Swipe gestures for tab navigation
  - Pull-to-refresh for file lists
  - Mobile toolbar for editor actions
- UI/UX improvements:
  - Loading spinner component
  - Custom toast notifications
  - Breadcrumb navigation
  - Empty state displays
  - Full responsive design

### Fixed
- File sync after Claude execution
- Mobile layout issues
- Touch gesture conflicts

## Phase 3 Completion - 2025-08-02

### Added
- Monaco Editor integration with syntax highlighting
- Claude execution via WebSocket
- Real-time output streaming
- Local bridge server with Express/Socket.io
- Firebase authentication middleware
- Claude CLI process management

## Phase 2 Completion - 2025-08-01

### Added
- Project management (CRUD operations)
- File management system
- Project card display
- File tree navigation

## Phase 1 Completion - 2025-07-31

### Added
- Initial project structure
- Firebase configuration
- GitHub OAuth authentication
- Basic UI with Tailwind CSS
- Type definitions for core entities