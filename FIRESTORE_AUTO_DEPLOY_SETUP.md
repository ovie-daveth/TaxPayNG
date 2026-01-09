# Automatic Firestore Rules Deployment Setup

This guide will help you set up automatic deployment of Firestore rules and indexes whenever you deploy to Vercel.

## How It Works

When you deploy to Vercel, the build process will:
1. Build your Next.js application
2. Automatically deploy your Firestore rules and indexes to Firebase

## Setup Instructions

### Step 1: Get Firebase CI Token

1. **Install Firebase CLI** (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase and get CI token**:
   ```bash
   firebase login:ci
   ```

3. **Copy the token** that's displayed. It will look something like:
   ```
   1//xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

### Step 2: Add Token to Vercel Environment Variables

1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select your project (TaxPayNG)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add the following:
   - **Name**: `FIREBASE_TOKEN`
   - **Value**: Paste the token you copied from Step 1
   - **Environment**: Select all environments (Production, Preview, Development)
6. Click **Save**

### Step 3: Verify Setup

1. **Push your changes** to your repository
2. **Vercel will automatically build and deploy**
3. Check the **Build Logs** in Vercel - you should see:
   ```
   🔥 Starting Firestore rules deployment...
   📤 Deploying Firestore rules and indexes...
   ✅ Firestore rules and indexes deployed successfully!
   ```

## Manual Deployment

If you need to deploy Firestore rules manually:

```bash
# Deploy only rules
npm run deploy:firestore:rules

# Deploy only indexes
npm run deploy:firestore:indexes

# Deploy both rules and indexes
npm run deploy:firestore:all

# Or use the automated script
npm run deploy:firestore
```

## Troubleshooting

### Error: FIREBASE_TOKEN not set

**Solution**: Make sure you've added `FIREBASE_TOKEN` to Vercel environment variables and selected all environments.

### Error: Firebase CLI not found

**Solution**: The script will automatically install `firebase-tools` if it's not found. If it still fails, ensure Node.js is available in your build environment.

### Error: Permission denied

**Solution**: 
1. Make sure your Firebase token is valid (it expires after some time)
2. Regenerate the token: `firebase login:ci`
3. Update the `FIREBASE_TOKEN` in Vercel environment variables

### Rules not updating in production

**Solution**:
1. Check Vercel build logs to see if deployment ran
2. Verify the token is set correctly
3. Check Firebase Console → Firestore → Rules to see current rules
4. Try manual deployment: `npm run deploy:firestore:rules`

## How It Works Technically

1. **Build Process**: Vercel runs `npm run build`
2. **Post-Build Hook**: After build completes, `npm run postbuild` runs automatically
3. **Deploy Script**: The `postbuild` script calls `deploy:firestore` which runs `scripts/deploy-firestore-rules.js`
4. **Firebase Deployment**: The script uses Firebase CLI to deploy rules and indexes

## Files Involved

- `firestore.rules` - Your Firestore security rules
- `firestore.indexes.json` - Your Firestore indexes
- `firebase.json` - Firebase project configuration
- `scripts/deploy-firestore-rules.js` - Deployment script
- `package.json` - Contains build and deploy scripts

## Security Notes

- **Never commit your FIREBASE_TOKEN** to version control
- The token is stored securely in Vercel environment variables
- Tokens can be revoked in Firebase Console if compromised
- Tokens expire after some time - you may need to regenerate them periodically

## Alternative: GitHub Actions (Optional)

If you prefer using GitHub Actions instead of Vercel's build process, you can create `.github/workflows/deploy-firestore.yml`:

```yaml
name: Deploy Firestore Rules

on:
  push:
    branches: [main]
    paths:
      - 'firestore.rules'
      - 'firestore.indexes.json'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install -g firebase-tools
      - run: firebase deploy --only firestore --token ${{ secrets.FIREBASE_TOKEN }}
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

Then add `FIREBASE_TOKEN` to your GitHub repository secrets.

