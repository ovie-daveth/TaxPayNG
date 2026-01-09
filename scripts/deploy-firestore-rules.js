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

// Parse command line arguments
const args = process.argv.slice(2);
const rulesOnly = args.includes('--rules-only');
const indexesOnly = args.includes('--indexes-only');

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

  // Determine which Firebase project to use based on environment
  const vercelEnv = process.env.VERCEL_ENV || 'development'; // production, preview, development
  let firebaseProject = 'trust-66319'; // default to production
  
  // Map Vercel environments to Firebase projects
  if (vercelEnv === 'production') {
    firebaseProject = 'trust-66319'; // Production project
  } else {
    firebaseProject = 'athena-bb111'; // Test/Preview/Development project
  }
  
  // Allow override via environment variable
  if (process.env.FIREBASE_PROJECT_ID) {
    firebaseProject = process.env.FIREBASE_PROJECT_ID;
  }

  console.log(`🔍 Using Firebase project: ${firebaseProject} (Environment: ${vercelEnv})`);

  // Determine what to deploy
  let deployTarget = 'firestore'; // Deploy both by default
  if (rulesOnly) {
    deployTarget = 'firestore:rules';
  } else if (indexesOnly) {
    deployTarget = 'firestore:indexes';
  }

  // Deploy Firestore rules and indexes
  console.log(`📤 Deploying ${deployTarget === 'firestore' ? 'Firestore rules and indexes' : deployTarget}...`);
  console.log(`Using command: ${firebaseCmd}`);
  console.log(`Target project: ${firebaseProject}`);
  
  try {
    execSync(
      `${firebaseCmd} deploy --only ${deployTarget} --token "${firebaseToken}" --non-interactive --project ${firebaseProject}`,
      { stdio: 'inherit' }
    );
    console.log(`✅ ${deployTarget === 'firestore' ? 'Firestore rules and indexes' : deployTarget} deployed successfully!`);
    if (deployTarget === 'firestore' || deployTarget === 'firestore:indexes') {
      console.log('📝 Note: Index creation may take a few minutes. Check Firebase Console → Firestore → Indexes');
    }
  } catch (deployError) {
    console.error('❌ Error deploying Firestore rules and indexes:');
    console.error(deployError.message);
    if (deployError.stdout) console.error('STDOUT:', deployError.stdout.toString());
    if (deployError.stderr) console.error('STDERR:', deployError.stderr.toString());
    
    // Try deploying indexes separately to see specific errors (only if not already trying indexes only)
    if (!indexesOnly) {
      console.log('\n🔄 Attempting to deploy indexes separately...');
      try {
        execSync(
          `${firebaseCmd} deploy --only firestore:indexes --token "${firebaseToken}" --non-interactive --project ${firebaseProject}`,
          { stdio: 'inherit' }
        );
        console.log('✅ Indexes deployed successfully!');
      } catch (indexError) {
        console.error('❌ Index deployment failed:', indexError.message);
        throw indexError;
      }
    } else {
      throw deployError;
    }
  }
} catch (error) {
  console.error('❌ Fatal error deploying Firestore:', error.message);
  console.error('Full error:', error);
  // Don't fail the build if Firestore deployment fails
  console.warn('⚠️  Continuing with build despite Firestore deployment error...');
  console.warn('💡 You can manually deploy indexes using: pnpm run deploy:firestore:indexes');
  process.exit(0);
}

