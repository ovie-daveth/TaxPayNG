# Phone Verification Setup

This guide explains how to set up phone number verification for user signup using Twilio SMS service.

## Overview

When users sign up, they must provide a phone number. After successful signup, a modal appears prompting them to verify their phone number via SMS OTP (One-Time Password).

## Features

- 6-digit OTP sent via SMS
- 10-minute expiration time
- 60-second resend cooldown
- 5 verification attempts per OTP
- Nigerian phone number validation (+234)
- Works in development mode without Twilio credentials (OTP logged to console)

## Twilio Setup

### 1. Create a Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free account
3. Verify your email and phone number

### 2. Get Your Credentials

1. Go to your [Twilio Console](https://console.twilio.com/)
2. Find your **Account SID** and **Auth Token** on the dashboard
3. Get a Twilio phone number:
   - Go to Phone Numbers → Manage → Buy a number
   - Choose a number that supports SMS
   - For testing, you can use the trial number

### 3. Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

**Important Notes:**
- Replace the placeholder values with your actual Twilio credentials
- The phone number must be in E.164 format (e.g., +1234567890)
- Never commit `.env.local` to version control

### 4. Install Dependencies

The Twilio SDK is already included in the project. If you need to install it manually:

```bash
pnpm add twilio
```

## Development Mode

If Twilio credentials are not configured, the system will operate in development mode:

- OTP codes will be logged to the server console
- No actual SMS will be sent
- The API will include the OTP in the response (for testing only)

This allows you to test the flow without setting up Twilio.

## Production Considerations

### 1. Security

- **Never** expose your Twilio credentials in client-side code
- Store credentials in environment variables only
- Use Twilio's webhook authentication for callbacks

### 2. Cost Optimization

- Twilio charges per SMS sent
- Free tier includes limited SMS credits
- Monitor usage in the Twilio Console
- Consider implementing rate limiting to prevent abuse

### 3. Scaling

For production, replace the in-memory OTP store with a persistent solution:

**Option 1: Redis**
```bash
pnpm add ioredis
```

**Option 2: Database (Firestore)**
- Store OTPs in a separate collection
- Set TTL using Firestore TTL policies
- Query by phone number for verification

### 4. Phone Number Validation

The current implementation validates Nigerian phone numbers (+234):
- Starts with 0, 7, 8, or 9
- 11 digits total for local format (0XXXXXXXXXX)
- 13 digits for international format (234XXXXXXXXX)

To support other countries, update the validation regex in:
- `app/api/send-phone-otp/route.ts`
- `app/api/verify-phone-otp/route.ts`

## API Endpoints

### POST `/api/send-phone-otp`

Sends an OTP to the specified phone number.

**Request:**
```json
{
  "phoneNumber": "08012345678"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Verification code sent successfully",
  "otp": "123456" // Only in development mode
}
```

### POST `/api/verify-phone-otp`

Verifies the OTP for a phone number.

**Request:**
```json
{
  "phoneNumber": "08012345678",
  "otp": "123456"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Phone number verified successfully"
}
```

## User Flow

1. User fills out signup form including phone number
2. User submits form and email verification is completed
3. Account is created successfully
4. Phone verification modal automatically appears
5. OTP is sent to the user's phone via SMS
6. User enters the 6-digit code
7. System verifies the code
8. User's phone number is marked as verified in the database
9. User is redirected to login

## Testing

### Manual Testing

1. Start your development server:
```bash
pnpm dev
```

2. Navigate to the signup page
3. Fill in all required fields including a phone number
4. Complete email verification
5. Check the server console for the OTP code
6. Enter the code in the verification modal
7. Verify that the phone number is marked as verified

### With Twilio (Production)

1. Set up Twilio credentials in `.env.local`
2. Use a real phone number that can receive SMS
3. Complete the signup flow
4. Check your phone for the SMS
5. Enter the code to verify

## Troubleshooting

### OTP Not Received

- **Check Twilio Console**: Verify the message was sent
- **Phone Number Format**: Ensure the number is valid Nigerian format
- **Trial Account**: Verify the recipient number in Twilio Console
- **Spam Filter**: Check spam/junk folders on your phone

### Invalid OTP Error

- **Expired**: OTP is valid for 10 minutes only
- **Wrong Code**: Check for typos
- **Too Many Attempts**: Request a new code after 5 failed attempts

### Development Mode Issues

- **OTP Not Logged**: Check the server console (not browser console)
- **API Errors**: Check server logs for detailed error messages

## Files Modified

- `app/signup/page.tsx` - Added phone field and verification modal
- `components/auth/phone-verification-dialog.tsx` - Verification modal UI
- `app/api/send-phone-otp/route.ts` - Send OTP endpoint
- `app/api/verify-phone-otp/route.ts` - Verify OTP endpoint
- `lib/services/otpStore.ts` - In-memory OTP storage

## Future Enhancements

- [ ] Support for international phone numbers
- [ ] Migrate to Redis for OTP storage
- [ ] Add rate limiting per phone number
- [ ] Support for WhatsApp verification as alternative
- [ ] SMS delivery status tracking
- [ ] Resend attempt limiting
