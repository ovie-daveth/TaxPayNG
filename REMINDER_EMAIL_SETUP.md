# Reminder Email Setup Guide

## Overview

The reminder system now sends actual email notifications to users when reminders are due. Emails are sent automatically via a cron job that checks for due reminders.

## How It Works

1. **Reminder Creation**: When a user creates a reminder, it's stored in the database
2. **Cron Job**: A scheduled job runs periodically (every hour) to check for reminders due within the next 24 hours
3. **Email Sending**: For each due reminder that hasn't been sent yet, an email is sent to the user
4. **Tracking**: The reminder is marked with `emailSent: true` and `emailSentAt` timestamp

## Setup Instructions

### 1. Configure Email Service (SMTP)

The system uses Nodemailer with SMTP. Configure your SMTP settings in `.env.local`:

```env
# Required SMTP Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Optional: Custom "From" address
SMTP_FROM=noreply@yourdomain.com

# Optional: App URL
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Optional: Secret key for cron job security
CRON_SECRET=your_random_secret_key
```

**For Gmail:**
1. Enable 2-Factor Authentication
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Use the App Password as `SMTP_PASS`

See `NODEMAILER_SETUP.md` for detailed SMTP configuration.

### 2. Set Up Cron Job

#### Option A: Vercel Cron (Recommended for Vercel deployments)

Add to `vercel.json` in your project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-reminders",
      "schedule": "0 * * * *"
    }
  ]
}
```

This runs every hour. You can adjust the schedule:
- Every hour: `"0 * * * *"`
- Every 30 minutes: `"*/30 * * * *"`
- Every day at 9 AM: `"0 9 * * *"`

#### Option B: External Cron Service

Use a service like:
- **cron-job.org**: https://cron-job.org
- **EasyCron**: https://www.easycron.com
- **UptimeRobot**: https://uptimerobot.com

Set up a GET request to:
```
https://yourdomain.com/api/cron/check-reminders?secret=YOUR_SECRET
```

Schedule it to run every hour (or as needed).

#### Option C: Manual Testing

You can manually trigger the cron job:
```bash
curl https://yourdomain.com/api/cron/check-reminders?secret=YOUR_SECRET
```

### 3. Environment Variables

Make sure all required environment variables are set:

```env
# SMTP Configuration (Required)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@yourdomain.com

# App Configuration
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Cron Security (Optional but recommended)
CRON_SECRET=your_random_secret_key_here
```

## API Endpoints

### Send Reminder Email
**POST** `/api/reminders/send-email`

Manually send a reminder email (usually called by the cron job).

**Request Body:**
```json
{
  "reminderId": "reminder_id",
  "userId": "user_id",
  "userEmail": "user@example.com",
  "userName": "John Doe",
  "reminderTitle": "Tax Payment Due",
  "reminderDescription": "Your quarterly tax payment is due soon",
  "dueDate": "2025-01-15T10:00:00Z",
  "priority": "high"
}
```

### Check and Send Reminders (Cron Job)
**GET** `/api/cron/check-reminders?secret=YOUR_SECRET`

Automatically checks for due reminders and sends emails.

**Query Parameters:**
- `secret` (optional): Secret key for authentication

**Response:**
```json
{
  "success": true,
  "message": "Processed 5 reminders",
  "sent": 5,
  "failed": 0,
  "errors": []
}
```

## Email Template

The reminder email includes:
- Reminder title and description
- Formatted due date
- Priority indicator (with emoji)
- Professional HTML template
- Plain text fallback

## Testing

1. **Create a test reminder** with a due date in the next 24 hours
2. **Manually trigger the cron job**:
   ```bash
   curl http://localhost:3000/api/cron/check-reminders
   ```
3. **Check your email** inbox (and spam folder)
4. **Verify the reminder** in the database has `emailSent: true`

## Troubleshooting

### Emails Not Sending

1. **Check SMTP configuration**: Verify all SMTP environment variables are set
2. **Check server logs**: Look for error messages in the console
3. **Test SMTP connection**: Use the nodemailer verification function
4. **Check spam folder**: Emails might be filtered as spam

### Cron Job Not Running

1. **Verify vercel.json**: Check that cron configuration is correct
2. **Check Vercel dashboard**: Look for cron job execution logs
3. **Test manually**: Try calling the endpoint directly
4. **Check secret key**: If using CRON_SECRET, ensure it matches

### Reminders Not Found

1. **Check due dates**: Ensure reminders have valid due dates
2. **Check completion status**: Only incomplete reminders are sent
3. **Check email sent status**: Reminders with `emailSent: true` won't be sent again

## Database Schema

The `Reminder` interface now includes:
```typescript
{
  // ... existing fields
  emailSent?: boolean      // Whether email has been sent
  emailSentAt?: string     // Timestamp when email was sent
}
```

## Security Notes

- The cron job endpoint accepts an optional `secret` parameter for authentication
- Set `CRON_SECRET` in environment variables for production
- SMTP credentials should never be committed to version control
- Use environment variables for all sensitive configuration

