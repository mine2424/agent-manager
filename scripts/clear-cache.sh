#!/bin/bash

echo "🧹 Clearing all caches..."

# Frontend Vite cache
echo "📦 Clearing frontend caches..."
rm -rf frontend/node_modules/.vite
rm -rf frontend/.vite
rm -rf frontend/dist

# pnpm store prune
echo "📦 Pruning pnpm store..."
pnpm store prune

# Clear node_modules if requested
if [ "$1" == "--full" ]; then
  echo "🗑️  Removing all node_modules..."
  rm -rf node_modules
  rm -rf frontend/node_modules
  rm -rf local-bridge/node_modules
  echo "📦 Reinstalling dependencies..."
  pnpm install
fi

echo "✅ Cache cleared!"
echo ""
echo "💡 Now run:"
echo "   pnpm dev"