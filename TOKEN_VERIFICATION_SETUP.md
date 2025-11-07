# Token-Based Email Verification Setup Guide

## Overview

Your waitlist now uses a token-based email verification system. Users receive a 6-digit code via email and must enter it to be added to the waitlist. **Users are NOT added to the waitlist until they verify the token.**

## How It Works

1. **User Submits Form**: User enters name, email, and optional phone
2. **Token Generated**: A 6-digit verification code is generated
3. **Token Stored**: Token is stored in `waitlistVerifications` collection (NOT in waitlist)
4. **Email Sent**: Token is sent to user's email
5. **User Enters Token**: User enters the 6-digit code in the UI
6. **Token Verified**: Token is verified and user is added to waitlist with `emailVerified: true`

## Setup Instructions

### 1. Configure Email Service

The current implementation logs tokens to the console. You need to integrate an email service.

**Option 1: Resend (Recommended)**

1. Sign up at [Resend](https://resend.com)
2. Get your API key
3. Install Resend: `npm install resend`
4. Update `app/api/send-waitlist-verification/route.ts`:

```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

async function sendVerificationEmail(email: string, name: string, token: string): Promise<boolean> {
  try {
    await resend.emails.send({
      from: 'noreply@yourdomain.com',
      to: email,
      subject: 'Verify your email for OTax Waitlist',
      html: `
        <h2>Hi ${name},</h2>
        <p>Your verification code is: <strong style="font-size: 24px; letter-spacing: 4px;">${token}</strong></p>
        <p>This code expires in 15 minutes.</p>
        <p>If you didn't request this code, please ignore this email.</p>
      `
    })
    return true
  } catch (error) {
    console.error('Email sending error:', error)
    return false
  }
}
```

Add to `.env.local`:
```env
RESEND_API_KEY=re_your_api_key_here
```

**Option 2: SendGrid**

1. Sign up at [SendGrid](https://sendgrid.com)
2. Get your API key
3. Install SendGrid: `npm install @sendgrid/mail`
4. Update the `sendVerificationEmail` function similarly

**Option 3: Nodemailer (SMTP) - ✅ IMPLEMENTED**

Nodemailer is already implemented! Just configure your SMTP settings:

1. Add environment variables to `.env.local`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@yourdomain.com  # Optional, defaults to SMTP_USER
```

2. **For Gmail:**
   - Enable 2-factor authentication
   - Generate an App Password: https://myaccount.google.com/apppasswords
   - Use the App Password as `SMTP_PASS`

3. **For other providers:**
   - Check their SMTP settings documentation
   - Common ports: 587 (TLS) or 465 (SSL)

### 2. Environment Variables

Add to `.env.local`:

```env
# For Nodemailer/SMTP (Already implemented)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@yourdomain.com  # Optional, defaults to SMTP_USER

# App URL (for email links)
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Alternative: Resend
# RESEND_API_KEY=your_resend_api_key

# Alternative: SendGrid
# SENDGRID_API_KEY=your_sendgrid_api_key
```

**Gmail Setup:**
1. Go to https://myaccount.google.com/security
2. Enable 2-Factor Authentication
3. Go to https://myaccount.google.com/apppasswords
4. Generate an App Password for "Mail"
5. Use that as `SMTP_PASS`

## Firestore Collections

### `waitlistVerifications` (Temporary)
Stores pending verifications before adding to waitlist:
```typescript
{
  name: string
  email: string
  phone?: string
  verificationToken: string  // 6-digit code
  createdAt: string
  expiresAt: string  // 15 minutes from creation
  attempts: number  // Failed verification attempts
}
```

### `waitlist` (Final)
Only added after token verification:
```typescript
{
  name: string
  email: string
  phone?: string
  createdAt: string
  emailVerified: true  // Always true (only added after verification)
  verifiedAt: string
  status: 'verified'
  notified: false
}
```

## User Flow

1. **Submit Form** → User fills out waitlist form
2. **Receive Email** → User gets email with 6-digit code
3. **Enter Token** → Token input dialog appears
4. **Verify** → User enters code and clicks "Verify"
5. **On Waitlist** → User is added to waitlist only after successful verification

## Token Security

- **6-digit code**: Randomly generated (100000-999999)
- **15-minute expiry**: Tokens expire after 15 minutes
- **5 attempt limit**: After 5 failed attempts, token is invalidated
- **One-time use**: Token is deleted after successful verification

## Testing

### Development Mode

Currently, tokens are logged to the console. Check your server logs to see the token:

```
📧 Verification Email for user@example.com
Hi John,
Your verification code is: 123456
This code expires in 15 minutes.
```

### Production

Make sure to:
1. Configure your email service
2. Set up proper email templates
3. Test email delivery
4. Monitor email service quotas

## Troubleshooting

### Tokens not being sent

- Check email service configuration
- Verify API keys are set correctly
- Check server logs for errors
- Ensure email service account is active

### Token verification failing

- Check if token expired (15 minutes)
- Verify token matches exactly (case-sensitive)
- Check if too many attempts (5 max)
- Verify Firestore permissions

### Users not added to waitlist

- Check if token verification succeeded
- Verify Firestore write permissions
- Check server logs for errors
- Ensure `waitlistVerifications` collection exists

## Benefits

✅ **No premature additions**: Users only added after verification  
✅ **Email verification**: Confirms email is real and accessible  
✅ **Better data quality**: Only verified emails in waitlist  
✅ **User-friendly**: Simple 6-digit code entry  
✅ **Secure**: Tokens expire and have attempt limits  

## Next Steps

1. Choose and configure your email service
2. Update `sendVerificationEmail` function
3. Test the full flow
4. Customize email template
5. Monitor email delivery rates

---

**Note**: Until you configure an email service, tokens will only be logged to the console. Make sure to set up email delivery before going to production!
