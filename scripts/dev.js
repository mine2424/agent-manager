#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Agent Manager development servers...\n');

const frontendDir = path.join(__dirname, '..', 'frontend');
const bridgeDir = path.join(__dirname, '..', 'local-bridge');

// Start frontend
console.log('🌐 Starting frontend on http://localhost:5173');
const frontend = spawn('pnpm', ['dev'], {
  cwd: frontendDir,
  stdio: 'inherit',
  shell: true
});

// Start local bridge
console.log('🔌 Starting local bridge on http://localhost:8080\n');
const bridge = spawn('pnpm', ['dev'], {
  cwd: bridgeDir,
  stdio: 'inherit',
  shell: true
});

// Handle exit
const cleanup = () => {
  console.log('\n🛑 Stopping servers...');
  frontend.kill();
  bridge.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Handle errors
frontend.on('error', (err) => {
  console.error('❌ Frontend error:', err);
  cleanup();
});

bridge.on('error', (err) => {
  console.error('❌ Bridge error:', err);
  cleanup();
});

console.log('✅ Both servers are starting...');
console.log('Press Ctrl+C to stop\n');