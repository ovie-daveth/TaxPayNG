#!/usr/bin/env node

/**
 * Script to deploy Firestore rules and indexes
 * This script is called automatically during Vercel builds
 * 
 * Usage:
 *   node scripts/deploy-firestore-rules.js
 * 
 * Environment Variables Required:
 *   - FIREBASE_TOKEN: Firebase CI token (get from: firebase login:ci)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔥 Starting Firestore rules deployment...');

// Check if firebase.json exists
const firebaseConfigPath = path.join(process.cwd(), 'firebase.json');
if (!fs.existsSync(firebaseConfigPath)) {
  console.error('❌ firebase.json not found. Skipping Firestore deployment.');
  process.exit(0);
}

// Check if firestore.rules exists
const rulesPath = path.join(process.cwd(), 'firestore.rules');
if (!fs.existsSync(rulesPath)) {
  console.error('❌ firestore.rules not found. Skipping Firestore deployment.');
  process.exit(0);
}

// Check if FIREBASE_TOKEN is set
const firebaseToken = process.env.FIREBASE_TOKEN;
if (!firebaseToken) {
  console.warn('⚠️  FIREBASE_TOKEN not set. Skipping Firestore deployment.');
  console.warn('   To enable automatic deployment:');
  console.warn('   1. Run: firebase login:ci');
  console.warn('   2. Copy the token');
  console.warn('   3. Add it to Vercel environment variables as FIREBASE_TOKEN');
  process.exit(0);
}

try {
  // Check if firebase-tools is available (local or global)
  let firebaseCmd = 'firebase';
  try {
    execSync('firebase --version', { stdio: 'ignore' });
  } catch (error) {
    // Try using npx/pnpm exec to use local version
    try {
      execSync('pnpm exec firebase --version', { stdio: 'ignore' });
      firebaseCmd = 'pnpm exec firebase';
    } catch (error2) {
      // Try npx as fallback
      try {
        execSync('npx firebase --version', { stdio: 'ignore' });
        firebaseCmd = 'npx firebase';
      } catch (error3) {
        console.log('📦 Installing firebase-tools globally...');
        execSync('npm install -g firebase-tools', { stdio: 'inherit' });
      }
    }
  }

  // Deploy Firestore rules and indexes
  console.log('📤 Deploying Firestore rules and indexes...');
  execSync(
    `${firebaseCmd} deploy --only firestore --token "${firebaseToken}" --non-interactive`,
    { stdio: 'inherit' }
  );

  console.log('✅ Firestore rules and indexes deployed successfully!');
} catch (error) {
  console.error('❌ Error deploying Firestore rules:', error.message);
  // Don't fail the build if Firestore deployment fails
  console.warn('⚠️  Continuing with build despite Firestore deployment error...');
  process.exit(0);
}

