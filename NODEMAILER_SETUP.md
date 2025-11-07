# Nodemailer Setup Guide

## Quick Start

Nodemailer is already installed and configured! Just add your SMTP credentials to send emails.

## Configuration

### 1. Add Environment Variables

Create or update your `.env.local` file:

```env
# Required SMTP Settings
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Optional: Custom "From" address
SMTP_FROM=noreply@yourdomain.com

# Optional: App URL for email links
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 2. Gmail Setup (Recommended for Testing)

1. **Enable 2-Factor Authentication**
   - Go to https://myaccount.google.com/security
   - Enable 2-Step Verification

2. **Generate App Password**
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other" as the device
   - Copy the 16-character password

3. **Use App Password**
   - Set `SMTP_PASS` to the generated App Password
   - **DO NOT** use your regular Gmail password

### 3. Other Email Providers

#### Outlook/Hotmail
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your_email@outlook.com
SMTP_PASS=your_password
```

#### Yahoo Mail
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your_email@yahoo.com
SMTP_PASS=your_app_password
```

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
```

#### Custom SMTP Server
```env
SMTP_HOST=mail.yourdomain.com
SMTP_PORT=587  # or 465 for SSL
SMTP_USER=noreply@yourdomain.com
SMTP_PASS=your_password
```

**Note:** Port 465 uses SSL (secure: true), port 587 uses TLS (secure: false)

## Testing

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Test the waitlist signup:**
   - Go to your waitlist form
   - Enter an email address
   - Check your email inbox (and spam folder)

3. **Check server logs:**
   - Successful: `✅ Verification email sent successfully: <message-id>`
   - Failed: `❌ Email sending error: <error>`
   - Not configured: `⚠️ SMTP not configured`

## Troubleshooting

### "SMTP connection verification failed"

**Possible causes:**
- Wrong SMTP credentials
- Firewall blocking SMTP port
- Provider requires App Password (Gmail)
- Port number incorrect

**Solutions:**
- Double-check your credentials
- Try port 465 instead of 587 (or vice versa)
- For Gmail, use App Password, not regular password
- Check firewall settings

### "Authentication failed"

**Gmail specific:**
- Must use App Password, not regular password
- 2FA must be enabled
- "Less secure app access" is deprecated

### Emails going to spam

**Solutions:**
- Use a custom domain email (not Gmail/Yahoo)
- Set up SPF, DKIM, and DMARC records
- Use a professional email service (SendGrid, Mailgun, etc.)
- Avoid spam trigger words in subject/content

### "Connection timeout"

**Possible causes:**
- Firewall blocking SMTP port
- Wrong SMTP host
- Network issues

**Solutions:**
- Check firewall settings
- Verify SMTP host is correct
- Try different port (587 vs 465)

## Production Recommendations

### For Production Use:

1. **Use a Professional Email Service:**
   - SendGrid (recommended)
   - Mailgun
   - Amazon SES
   - Resend

2. **Set Up Proper DNS Records:**
   - SPF record
   - DKIM signature
   - DMARC policy

3. **Monitor Email Delivery:**
   - Track open rates
   - Monitor bounce rates
   - Set up alerts for failures

4. **Security:**
   - Never commit `.env.local` to git
   - Use environment variables in production
   - Rotate passwords regularly
   - Use App Passwords, not account passwords

## Email Template Customization

The email template is in `app/api/send-waitlist-verification/route.ts`. You can customize:

- Colors (currently using green theme #10b981)
- Logo/branding
- Layout
- Content/text

## Next Steps

1. ✅ Configure SMTP settings in `.env.local`
2. ✅ Test email sending
3. ✅ Verify emails are received
4. ✅ Check spam folder if needed
5. ✅ Customize email template if desired

---

**Note:** If SMTP is not configured, the system will fall back to console logging (for development only).
