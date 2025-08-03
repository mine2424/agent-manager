# Agent Manager

A web-based execution environment for Claude Code with project management capabilities.

## Overview

Agent Manager allows you to run Claude Code from your web browser, manage projects, edit files, and see real-time execution results through a local bridge server.

## Project Structure

```
agent-manager/
├── frontend/          # React + TypeScript web application
├── local-bridge/      # Node.js local bridge server
└── docs/             # Documentation
```

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Claude CLI installed and configured
- Firebase project (for authentication and data storage)
- GitHub account (for authentication)

## Setup Instructions

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/agent-manager.git
cd agent-manager
```

### 2. Firebase Setup

1. Create a new Firebase project at https://console.firebase.google.com
2. Enable Authentication with GitHub provider
3. Create a Firestore database
4. Copy your Firebase configuration

### 3. Frontend Setup

```bash
cd frontend
cp .env.example .env
# Edit .env with your Firebase configuration
npm install
npm run dev
```

### 4. Local Bridge Setup

```bash
cd ../local-bridge
cp .env.example .env
# Edit .env with your configuration
npm install
npm run dev
```

## Development

- Frontend runs on http://localhost:5173
- Local bridge runs on http://localhost:8080

## Features (MVP)

- GitHub authentication
- Project management (CRUD)
- File creation and editing
- Claude Code execution via local bridge
- Real-time output streaming

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Firebase, Monaco Editor
- **Local Bridge**: Node.js, Express, Socket.io
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth with GitHub OAuth

## License

MIT