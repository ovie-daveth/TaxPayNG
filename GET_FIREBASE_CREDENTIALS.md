# How to Get Firebase Service Account Credentials

## Quick Answer

The `FIREBASE_CLIENT_EMAIL` is found in the Firebase Console under **Project Settings → Service Accounts**. It looks like:
```
firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
```

## Step-by-Step Instructions

### Step 1: Go to Firebase Console

1. Open your browser and go to [Firebase Console](https://console.firebase.google.com/)
2. Sign in with your Google account
3. Select your project (or create one if you don't have one)

### Step 2: Navigate to Service Accounts

1. Click the **⚙️ Settings** icon (gear icon) in the top left corner
2. Select **Project Settings** from the dropdown menu
3. Click on the **Service Accounts** tab at the top

### Step 3: Generate Private Key

1. You'll see a section titled **"Firebase Admin SDK"**
2. Under the **"Node.js"** tab, look for the button **"Generate new private key"**
3. Click the button
4. A warning dialog will appear (this is normal)
5. Click **"Generate key"** to confirm

### Step 4: Download JSON File

1. A JSON file will be automatically downloaded
2. It will have a name like: `your-project-firebase-adminsdk-xxxxx-abc123.json`
3. **⚠️ Keep this file secure - it contains sensitive credentials!**

### Step 5: Extract the Three Values You Need

Open the downloaded JSON file in a text editor. You'll see something like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",           ← COPY THIS
  "private_key_id": "abc123...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQ...\n-----END PRIVATE KEY-----\n",  ← COPY THIS (entire thing)
  "client_email": "firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com",  ← COPY THIS
  "client_id": "123456789",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/..."
}
```

**You need these 3 values:**
1. **`project_id`** → `FIREBASE_PROJECT_ID`
2. **`client_email`** → `FIREBASE_CLIENT_EMAIL` ← **This is what you asked about!**
3. **`private_key`** → `FIREBASE_PRIVATE_KEY`

### Step 6: Add to `.env.local`

Open or create `.env.local` in your project root and add:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**⚠️ Critical Notes for `FIREBASE_PRIVATE_KEY`:**
- Must be wrapped in **quotes** (`"`)
- Must include the `\n` characters (they're important!)
- Must include the entire key from `-----BEGIN PRIVATE KEY-----` to `-----END PRIVATE KEY-----`
- Don't add extra spaces or line breaks

### Step 7: Restart Your Server

```bash
# Stop your current server (Ctrl+C)
# Then restart:
npm run dev
```

### Step 8: Test It

1. Try submitting the waitlist form
2. Check your terminal - you should **NOT** see permission errors anymore
3. The verification email should be sent successfully

## Alternative: Quick Copy from JSON

If you want to quickly extract the values, here's what each one looks like in the JSON:

- **project_id**: `"project_id": "my-awesome-project"`
- **client_email**: `"client_email": "firebase-adminsdk-abc12@my-awesome-project.iam.gserviceaccount.com"`
- **private_key**: `"private_key": "-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"`

## Security Reminders

⚠️ **Important:**
- **Never commit** the JSON file to git
- **Never commit** `.env.local` to git
- **Never share** these credentials publicly
- The service account has admin access to your Firebase project

## Troubleshooting

### Can't find "Service Accounts" tab?
- Make sure you're in **Project Settings** (not General Settings)
- Look for the **Service Accounts** tab at the top

### "Generate new private key" button not visible?
- Make sure you have owner/editor permissions on the project
- Try refreshing the page

### Private key format issues?
- Make sure it's wrapped in quotes: `"-----BEGIN..."`
- Keep the `\n` characters (they're important)
- Don't add extra spaces or line breaks

---

**That's it!** Once you've added these to `.env.local` and restarted your server, the permission errors should be resolved.
