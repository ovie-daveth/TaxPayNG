# ImageKit Setup Guide

## 1. Get ImageKit Credentials

1. Sign up at [ImageKit.io](https://imagekit.io)
2. Go to your dashboard
3. Copy these values:
   - **Public Key** (from Developer Options)
   - **URL Endpoint** (from Developer Options)
   - **Private Key** (from Developer Options)

## 2. Add Environment Variables

Add these to your `.env.local` file:

```env
# ImageKit Configuration
NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY=your_public_key_here
NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_imagekit_id
IMAGEKIT_PRIVATE_KEY=your_private_key_here
```

## 3. Install ImageKit Package

```bash
npm install imagekit
```

## 4. Test the Setup

1. Restart your development server
2. Try uploading an image in the transaction form
3. Check the browser console for any errors

## Security Notes

- ✅ Public Key and URL Endpoint are safe to expose to the client
- 🔒 Private Key is only used on the server side (API routes)
- 🔒 Upload happens through our secure API endpoints

## Troubleshooting

If you get "Missing privateKey" error:
1. Make sure `IMAGEKIT_PRIVATE_KEY` is in your `.env.local`
2. Restart your development server
3. Check that the private key is correct (no extra spaces/characters)
