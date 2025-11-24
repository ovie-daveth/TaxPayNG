# Fix Firebase Admin SDK Credential Error

## Error: "invalid_grant: Invalid JWT Signature"

This error occurs when Firebase Admin SDK cannot authenticate with your service account credentials.

## Quick Fix Steps

### Step 1: Generate a New Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click **⚙️ Settings** → **Project Settings**
4. Go to the **Service Accounts** tab
5. Click **Generate New Private Key**
6. Confirm and download the JSON file

### Step 2: Extract Credentials from JSON

Open the downloaded JSON file and copy these three values:

```json
{
  "project_id": "your-project-id",           ← Copy this
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",  ← Copy this
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"  ← Copy this (entire thing)
}
```

### Step 3: Update .env.local

Open or create `.env.local` in your project root and add/update:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**⚠️ Critical Notes:**
- `FIREBASE_PRIVATE_KEY` must be wrapped in **quotes** (`"`)
- Must include the `\n` characters (they're important!)
- Must include the entire key from `-----BEGIN PRIVATE KEY-----` to `-----END PRIVATE KEY-----`
- Don't add extra spaces or line breaks

### Step 4: Restart Your Development Server

```bash
# Stop your server (Ctrl+C)
# Then restart:
npm run dev
# or
pnpm dev
```

### Step 5: Test Signup

Try signing up again. The error should be resolved.

## Alternative: Check System Time

If regenerating the key doesn't work, your system time might be out of sync:

**Windows:**
1. Right-click the clock in the taskbar
2. Select "Adjust date/time"
3. Click "Sync now" under "Synchronize your clock"

**Mac:**
1. Open System Preferences → Date & Time
2. Click "Set time zone automatically using your current location"
3. Or manually set the correct time

## Still Having Issues?

1. **Check your .env.local file exists** in the project root
2. **Verify all three variables are set** (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
3. **Check the console** for more detailed error messages (the improved error handling will show exactly what's missing)
4. **Make sure you restarted the server** after updating .env.local

## Verify Your Setup

After fixing, you should see this in your console when the server starts:
```
✅ Firebase Admin SDK initialized successfully with service account credentials
```

If you see an error instead, check the error message - it will tell you exactly what's wrong.

