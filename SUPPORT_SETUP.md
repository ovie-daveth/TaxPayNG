# Support Feature Setup Guide

## Overview

The support feature allows customers to contact the OTax support team via email or WhatsApp directly from the settings page.

## Features

1. **Email Support Form**
   - Category selection (General, Technical, Billing, Feature Request, Bug Report, Other)
   - Subject and message fields
   - Sends email to support team with user information

2. **WhatsApp Support**
   - Direct link to open WhatsApp chat
   - Pre-filled message with user information
   - Opens in new tab/window

## Configuration

### 1. Environment Variables

Add these to your `.env.local` file:

```env
# Support Email (where support requests will be sent)
SUPPORT_EMAIL=support@taxpayng.com

# WhatsApp Number (format: country code + number, no + or spaces)
# Example for Nigeria: 2348123456789
NEXT_PUBLIC_WHATSAPP_NUMBER=2348123456789

# SMTP Configuration (required for email support)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@taxpayng.com
```

### 2. WhatsApp Number Format

The WhatsApp number should be in international format without the `+` sign:
- ✅ Correct: `2348123456789` (Nigeria)
- ❌ Wrong: `+2348123456789` or `08123456789`

### 3. Support Email

- If `SUPPORT_EMAIL` is not set, it will use `SMTP_USER` as fallback
- If neither is set, it defaults to `support@taxpayng.com`
- Make sure the email address is valid and monitored

## How It Works

### Email Support

1. User fills out the support form in Settings → Support tab
2. Form includes:
   - Category (dropdown)
   - Subject (text input)
   - Message (textarea)
3. On submit:
   - Authenticates user via Firebase token
   - Sends email to support team via SMTP
   - Email includes:
     - User name and email
     - User ID
     - Category
     - Subject and message
   - Reply-to is set to user's email for easy response

### WhatsApp Support

1. User clicks "Open WhatsApp" button
2. Opens WhatsApp Web/App with pre-filled message
3. Message includes:
   - User email
   - User ID
   - Default greeting
4. User can edit message before sending

## API Endpoint

### POST `/api/support/send-email`

**Headers:**
```
Authorization: Bearer <firebase_token>
Content-Type: application/json
```

**Body:**
```json
{
  "subject": "Support request subject",
  "message": "Support request message",
  "category": "general" // optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Support request sent successfully. We will get back to you soon!"
}
```

## Testing

### Test Email Support

1. Go to Settings → Support tab
2. Fill out the form:
   - Select a category
   - Enter a subject
   - Enter a message
3. Click "Send Email"
4. Check your support email inbox
5. Verify email includes all user information

### Test WhatsApp Support

1. Go to Settings → Support tab
2. Click "Open WhatsApp" button
3. Verify WhatsApp opens with pre-filled message
4. Verify message includes user email and ID

## Troubleshooting

### Email Not Sending

1. **Check SMTP Configuration**
   - Verify all SMTP environment variables are set
   - Test SMTP connection using `verifyTransporter()` function
   - See `NODEMAILER_SETUP.md` for detailed SMTP setup

2. **Check Support Email**
   - Verify `SUPPORT_EMAIL` is set correctly
   - Check spam folder if emails aren't arriving

3. **Check Server Logs**
   - Look for error messages in console
   - Common errors:
     - "Email service not configured" → SMTP not set up
     - "Invalid token" → Authentication issue
     - "Failed to send" → SMTP connection issue

### WhatsApp Not Opening

1. **Check WhatsApp Number Format**
   - Must be in international format without `+`
   - Example: `2348123456789` (not `+2348123456789`)

2. **Check Environment Variable**
   - Verify `NEXT_PUBLIC_WHATSAPP_NUMBER` is set
   - Must start with `NEXT_PUBLIC_` to be accessible on client

3. **Browser Issues**
   - Some browsers block pop-ups
   - User may need to allow pop-ups for your domain

## Security

- All email requests require Firebase authentication
- User information is automatically included for support context
- Support emails use reply-to for easy response
- WhatsApp messages are sent directly by user (no server involvement)

## Future Enhancements

Potential improvements:
- Support ticket system with tracking
- Support history/chat log
- File attachments for email support
- Priority support based on subscription tier
- Live chat integration
- Support knowledge base/FAQ integration

