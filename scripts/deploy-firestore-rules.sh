#!/bin/bash

# Script to deploy Firestore rules and indexes
# This script is called automatically during Vercel builds

set -e  # Exit on error

echo "🔥 Starting Firestore rules deployment..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Installing..."
    npm install -g firebase-tools
fi

# Check if FIREBASE_TOKEN is set (required for CI/CD)
if [ -z "$FIREBASE_TOKEN" ]; then
    echo "⚠️  FIREBASE_TOKEN not set. Skipping Firestore deployment."
    echo "   To enable automatic deployment, set FIREBASE_TOKEN in Vercel environment variables."
    exit 0
fi

# Authenticate using token
echo "🔐 Authenticating with Firebase..."
firebase use --token "$FIREBASE_TOKEN" || firebase login:ci --token "$FIREBASE_TOKEN"

# Deploy Firestore rules and indexes
echo "📤 Deploying Firestore rules and indexes..."
firebase deploy --only firestore --token "$FIREBASE_TOKEN" --non-interactive

echo "✅ Firestore rules and indexes deployed successfully!"

