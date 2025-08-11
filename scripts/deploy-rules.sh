#!/bin/bash

echo "🚀 Deploying Firestore security rules..."

# Check if firebase-tools is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed."
    echo "📦 Installing Firebase CLI..."
    npm install -g firebase-tools
fi

# Deploy only Firestore rules
echo "📝 Deploying Firestore rules..."
firebase deploy --only firestore:rules --project agent-manager-9e720

if [ $? -eq 0 ]; then
    echo "✅ Firestore rules deployed successfully!"
else
    echo "❌ Failed to deploy Firestore rules"
    echo ""
    echo "💡 If you haven't logged in to Firebase CLI, run:"
    echo "   firebase login"
    echo ""
    echo "💡 If the project ID is incorrect, run:"
    echo "   firebase use agent-manager-9e720"
fi