# Paystack Setup Guide for Subscriptions

## Overview

This guide will help you set up Paystack payment integration for subscription payments in TaxPayNG.

## Step 1: Create a Paystack Account

1. Go to [Paystack](https://paystack.com) and sign up for an account
2. Complete the account verification process
3. Access your dashboard

## Step 2: Get Your API Keys

1. **Log in to Paystack Dashboard**
   - Go to [Paystack Dashboard](https://dashboard.paystack.com)
   - Navigate to **Settings** → **API Keys & Webhooks**

2. **Get Test Keys (for Development)**
   - Scroll to the **Test Keys** section
   - Copy your **Test Secret Key** (starts with `sk_test_`)
   - Copy your **Test Public Key** (starts with `pk_test_`)

3. **Get Live Keys (for Production)**
   - After testing, switch to **Live Keys** section
   - Copy your **Live Secret Key** (starts with `sk_live_`)
   - Copy your **Live Public Key** (starts with `pk_live_`)

## Step 3: Add Keys to Environment Variables

Add these to your `.env.local` file:

```env
# Paystack Configuration
PAYSTACK_SECRET_KEY=sk_test_your_test_secret_key_here
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_test_public_key_here

# App URL (for callback)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Important Notes:**
- For **development**: Use test keys (start with `sk_test_` and `pk_test_`)
- For **production**: Use live keys (start with `sk_live_` and `pk_live_`)
- Never commit your secret keys to version control
- The secret key should be kept secure and only used on the server side

## Step 4: Test the Integration

### Test Card Numbers

Paystack provides test card numbers for testing:

**Successful Payment:**
- Card Number: `4084084084084081`
- Expiry: Any future date (e.g., `12/25`)
- CVV: Any 3 digits (e.g., `123`)
- PIN: Any 4 digits (e.g., `0000`)

**Declined Payment:**
- Card Number: `4084084084084085`
- Expiry: Any future date
- CVV: Any 3 digits

### Testing Steps

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Log in to your account**

3. **Go to Pricing or Settings:**
   - Visit `/pricing` or `/dashboard/settings?tab=subscription`
   - Click "Subscribe Now" on any plan

4. **Complete Payment:**
   - You'll be redirected to Paystack payment page
   - Use the test card: `4084084084084081`
   - Complete the payment

5. **Verify Subscription:**
   - After successful payment, you'll be redirected back
   - Check your subscription status in Settings

## Step 5: Set Up Webhook (Optional, for Production)

For production, you should set up webhooks to handle payment events:

1. **In Paystack Dashboard:**
   - Go to **Settings** → **API Keys & Webhooks**
   - Click **Add Webhook URL**
   - Enter: `https://yourdomain.com/api/subscription/verify`
   - Select events: `charge.success`, `charge.failed`

2. **Verify Webhook Signature:**
   - Paystack will send a signature header
   - Verify it in your webhook handler (currently not implemented, but recommended for production)

## Troubleshooting

### Error: "Invalid key"

**Solution:**
- Make sure `PAYSTACK_SECRET_KEY` is set in `.env.local`
- Verify the key starts with `sk_test_` (for test) or `sk_live_` (for live)
- Restart your development server after adding the key
- Check that there are no extra spaces or quotes around the key

### Error: "Paystack Secret Key not configured"

**Solution:**
- Add `PAYSTACK_SECRET_KEY` to your `.env.local` file
- Make sure the file is in the root directory of your project
- Restart your development server

### Payment Not Redirecting Back

**Solution:**
- Check that `NEXT_PUBLIC_APP_URL` is set correctly
- For local development, use `http://localhost:3000`
- For production, use your actual domain (e.g., `https://yourdomain.com`)

## Security Best Practices

1. **Never expose secret keys:**
   - Secret keys should only be in `.env.local` (server-side)
   - Public keys can be exposed (they're in `NEXT_PUBLIC_*`)

2. **Use different keys for development and production:**
   - Test keys for development
   - Live keys for production

3. **Rotate keys periodically:**
   - If a key is compromised, regenerate it in Paystack dashboard

4. **Verify webhook signatures in production:**
   - Always verify Paystack webhook signatures to prevent fraud

## Support

- [Paystack Documentation](https://paystack.com/docs)
- [Paystack API Reference](https://paystack.com/docs/api)
- [Paystack Support](https://paystack.com/contact)

