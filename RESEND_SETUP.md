# Resend Email Service Setup

## Why Resend?

Resend is a modern email API that provides:
- **Fast delivery**: Emails are delivered in seconds, not days
- **High deliverability**: Better inbox placement than SMTP
- **Parallel sending**: Can send multiple emails simultaneously
- **Free tier**: 3,000 emails/month free
- **Simple API**: Easy to integrate with Next.js

## Setup Instructions

### 1. Create a Resend Account

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get Your API Key

1. Go to [resend.com/api-keys](https://resend.com/api-keys)
2. Click "Create API Key"
3. Name it (e.g., "OTax Production")
4. Copy the API key (starts with `re_`)

### 3. Add Domain (Optional but Recommended)

For better deliverability:
1. Go to [resend.com/domains](https://resend.com/domains)
2. Click "Add Domain"
3. Add your domain (e.g., `otaxng.com`)
4. Follow DNS setup instructions
5. Verify your domain

### 4. Configure Environment Variables

Add to your `.env.local` (development) and Vercel environment variables (production):

```env
# Resend Configuration (Recommended - Fast & Reliable)
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM=noreply@otaxng.com  # or your verified domain email

# SMTP Configuration (Fallback - will be used if Resend is not configured)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@otax.com
```

### 5. Install Dependencies

The `resend` package is already added to `package.json`. Run:

```bash
pnpm install
```

## How It Works

1. **Primary**: The system tries Resend first (if `RESEND_API_KEY` is set)
2. **Fallback**: If Resend fails or isn't configured, it falls back to SMTP
3. **Parallel Processing**: Bulk emails are sent in batches of 20 simultaneously
4. **Fast Delivery**: Emails typically arrive in seconds instead of hours/days

## Performance Comparison

- **SMTP (Old)**: ~1-2 seconds per email, sequential = 100 emails = 100-200 seconds
- **Resend (New)**: ~0.1 seconds per email, parallel (20 at a time) = 100 emails = ~5 seconds

## Testing

After setup, test by sending a bulk email from the admin dashboard. You should see:
- Faster sending (seconds instead of minutes)
- Better delivery rates
- Console logs showing "Resend" as the service

## Troubleshooting

### Emails not sending
- Check that `RESEND_API_KEY` is set correctly
- Verify your domain (if using custom domain)
- Check Resend dashboard for errors

### Still using SMTP
- Ensure `RESEND_API_KEY` is in your environment variables
- Restart your development server after adding the key
- Check console logs for which service is being used

## Cost

- **Free Tier**: 3,000 emails/month
- **Paid Plans**: Start at $20/month for 50,000 emails
- Much cheaper than maintaining SMTP infrastructure

## Migration Notes

- Existing SMTP configuration will continue to work as fallback
- No breaking changes - the system automatically uses the best available service
- You can use both simultaneously (Resend for bulk, SMTP for single emails if needed)

