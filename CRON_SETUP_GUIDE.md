# External Cron Job Setup Guide

This guide will help you set up the unified daily tasks cron job using cron-job.org (or any external cron service).

## What the Cron Job Does

The unified cron job (`/api/cron/daily-tasks`) handles:
1. **Reminder Emails**: Checks for reminders due within 24 hours and sends email notifications
2. **Subscription Expiry**: Deactivates expired subscriptions and sets warning flags

## Setup Instructions

### Step 1: Get Your Production URL

Your cron job endpoint will be:
```
https://yourdomain.com/api/cron/daily-tasks?secret=YOUR_SECRET
```

Replace:
- `yourdomain.com` with your actual Vercel domain (e.g., `taxpayng.vercel.app` or your custom domain)
- `YOUR_SECRET` with your `CRON_SECRET` from environment variables

### Step 2: Set Up cron-job.org

1. **Create Account**
   - Go to https://cron-job.org
   - Sign up for a free account (supports up to 2 cron jobs on free tier)

2. **Create New Cron Job**
   - Click "Create cronjob"
   - Fill in the following:

   **Basic Settings:**
   - **Title**: `TaxPayNG Daily Tasks`
   - **Address (URL)**: `https://yourdomain.com/api/cron/daily-tasks?secret=YOUR_SECRET`
   - **Request method**: `GET`
   - **Schedule**: `Daily at 4:00 AM` (or your preferred time)

   **Advanced Settings (Optional):**
   - **Timezone**: Select your preferred timezone (e.g., `Africa/Lagos` or `UTC`)
   - **Timeout**: `300` seconds (5 minutes) - should be enough
   - **Status**: `Active`

3. **Save the Cron Job**

### Step 3: Test the Cron Job

1. **Manual Test**
   - In cron-job.org, click "Execute now" on your cron job
   - Check the execution log to see if it succeeded
   - You should see a JSON response with results

2. **Check Your Application**
   - Verify reminders are being sent (if any are due)
   - Check subscription expiry warnings are being set

### Step 4: Monitor the Cron Job

- cron-job.org provides execution logs
- Check logs regularly to ensure the job is running successfully
- Set up email notifications in cron-job.org for failed executions

## Environment Variables

Make sure these are set in your Vercel project:

```env
# Required for cron job security
CRON_SECRET=your_random_secret_key_here

# Required for email sending
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@yourdomain.com
```

## Schedule Recommendations

- **Daily at 4:00 AM**: Good for checking reminders and subscriptions
- **Daily at 9:00 AM**: Alternative if you prefer morning execution
- **Every 6 hours**: If you need more frequent checks (requires paid plan)

## Troubleshooting

### Cron Job Fails with 401 Unauthorized
- Check that `CRON_SECRET` in your environment variables matches the secret in the URL
- Ensure the secret is properly URL-encoded if it contains special characters

### Cron Job Returns 500 Error
- Check Vercel function logs for detailed error messages
- Verify all environment variables are set correctly
- Ensure Firebase Admin SDK is properly configured

### Reminders Not Sending
- Verify SMTP settings are correct
- Check that users have email notifications enabled in their preferences
- Review the cron job execution logs for specific error messages

### Subscriptions Not Being Deactivated
- Check the execution logs for any errors
- Verify the `isSubscribe` field exists in user profiles
- Ensure `subscriptionExpiryDate` is set correctly

## Alternative Cron Services

If cron-job.org doesn't work for you, you can use:

- **EasyCron**: https://www.easycron.com
- **UptimeRobot**: https://uptimerobot.com (monitoring + cron)
- **Cronitor**: https://cronitor.io (paid, more features)

All of these services work the same way - just point them to your endpoint URL.

## Security Notes

- **Never commit your CRON_SECRET to version control**
- Use a strong, random secret (at least 32 characters)
- The secret prevents unauthorized access to your cron endpoint
- Consider rotating the secret periodically

## Manual Execution

You can also manually trigger the cron job for testing:

```bash
curl "https://yourdomain.com/api/cron/daily-tasks?secret=YOUR_SECRET"
```

Or use any HTTP client like Postman, Insomnia, etc.

