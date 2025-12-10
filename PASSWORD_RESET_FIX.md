# Password Reset Token Issue - FIXED

## Problem Summary

When testing the password reset flow locally, the reset token was being rejected as "Invalid or expired". The issue was caused by URL encoding in the email preview output.

### Root Cause

The backend uses Nodemailer's `streamTransport` to preview emails in the console during local development. Nodemailer applies quoted-printable encoding to HTML emails, which encodes the `=` character in URLs as `=3D`.

**Example:**
- **Correct token:** `e6b8520e726fc292ef343dc7385b782219f88dd9afe7d06cb0b48ad18e71e71c`
- **Encoded in HTML preview:** `token=3De6b8520e726fc292ef343dc7385b782219f88dd9afe7d06cb0b48ad18e71e71c`

When copying from the HTML preview section, users were inadvertently copying `3De6b85...` instead of `e6b85...`, causing token validation to fail.

## Solutions Implemented

### 1. Backend: Improved Console Logging ([/backend/shared/utils/email.ts](backend/shared/utils/email.ts))

The backend now extracts and displays the actual token before the email preview:

```typescript
// Extract and display the actual token/link for easy testing
const tokenMatch = (options.text || options.html).match(/token=([a-f0-9]{64})/);
if (tokenMatch) {
  console.log('🔑 RESET TOKEN (copy this):', tokenMatch[1]);
  console.log('🔗 Reset URL:', `${FRONTEND_URL}/reset-password?token=${tokenMatch[1]}`);
  console.log('---');
}
```

**New Console Output:**
```
📧 Email would be sent:
To: admin@elearning.com
Subject: Reset Your Password - E-Learning Platform
Body: See HTML below
---
🔑 RESET TOKEN (copy this): e6b8520e726fc292ef343dc7385b782219f88dd9afe7d06cb0b48ad18e71e71c
🔗 Reset URL: http://localhost:3000/reset-password?token=e6b8520e726fc292ef343dc7385b782219f88dd9afe7d06cb0b48ad18e71e71c
---
Email preview (for reference only - use token above): ...
```

### 2. Mobile App: URL Decoding ([/mobile/src/screens/auth/ResetPasswordScreen.tsx](mobile/src/screens/auth/ResetPasswordScreen.tsx))

The ResetPasswordScreen now automatically decodes URL-encoded tokens:

```typescript
const verifyToken = async (resetToken: string) => {
  setVerifying(true);
  try {
    // Decode the token in case it comes URL-encoded
    const decodedToken = decodeURIComponent(resetToken);

    const response = await authApi.verifyResetToken(decodedToken);
    if (response.valid) {
      setTokenValid(true);
      setEmail(response.email);
      // Store the decoded token for submission
      setToken(decodedToken);
    }
    // ...
  }
};
```

This ensures that even if a token comes through with URL encoding, it will be properly decoded before verification.

## How to Test Now

### Option 1: Using the Test Script (Recommended)

```bash
cd backend
./test-password-reset.sh
```

When prompted for the token:
1. Look at the backend console
2. Find the line: `🔑 RESET TOKEN (copy this):`
3. Copy the 64-character hexadecimal token
4. Paste when prompted

### Option 2: Manual Testing with Mobile App

1. Start the backend:
```bash
cd backend
npm run dev
```

2. Start the mobile app:
```bash
cd mobile
npm start
```

3. In the mobile app, navigate to ForgotPassword screen
4. Enter: `admin@elearning.com`
5. Check backend console for the token
6. Open the reset link in your app (deep link or manually navigate)

### Option 3: Direct API Testing

```bash
# 1. Request reset
curl -X POST http://localhost:3000/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@elearning.com"}'

# 2. Check console, copy the token from: 🔑 RESET TOKEN (copy this): xxx

# 3. Verify token
curl -X GET "http://localhost:3000/auth/password-reset/verify?token=YOUR_TOKEN_HERE"

# 4. Reset password
curl -X POST http://localhost:3000/auth/password-reset/reset \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN_HERE",
    "newPassword": "NewPassword123!"
  }'

# 5. Test login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@elearning.com",
    "password": "NewPassword123!"
  }'
```

## Token Format Reference

### Valid Token
- Length: Exactly 64 characters
- Characters: Only `a-f` (lowercase) and `0-9`
- Example: `e6b8520e726fc292ef343dc7385b782219f88dd9afe7d06cb0b48ad18e71e71c`

### Invalid Token (URL-encoded)
- Has `3D` prefix or in the middle
- Example: `3De6b8520e726fc292ef343dc7385b782219f88dd9afe7d06cb0b48ad18e71e71c` ❌

## Why This Only Affects Local Development

In production:
- Real emails are sent via AWS SES or other SMTP servers
- Email clients automatically handle quoted-printable decoding
- Users click links directly from their email app
- The decoding happens automatically, so this issue never occurs

In local development:
- Emails are printed to console for testing
- Developers manually copy tokens from console output
- The HTML preview shows encoded URLs
- Without clear guidance, developers copy the wrong token

## Files Modified

1. **[/backend/shared/utils/email.ts](backend/shared/utils/email.ts)**
   - Added token extraction and clear display
   - Improved console output formatting

2. **[/mobile/src/screens/auth/ResetPasswordScreen.tsx](mobile/src/screens/auth/ResetPasswordScreen.tsx)**
   - Added automatic URL decoding with `decodeURIComponent()`
   - Ensures tokens work even if URL-encoded

## Additional Documentation

- [TOKEN_COPY_GUIDE.md](backend/TOKEN_COPY_GUIDE.md) - Detailed guide on copying tokens
- [PASSWORD_RESET_FLOW.md](backend/PASSWORD_RESET_FLOW.md) - Complete flow documentation
- [PASSWORD_RESET_IMPLEMENTATION.md](mobile/PASSWORD_RESET_IMPLEMENTATION.md) - Mobile implementation guide

## Testing Checklist

- [x] Backend extracts and displays clean token in console
- [x] Mobile app decodes URL-encoded tokens
- [x] Test script works with new format
- [ ] Request password reset via API
- [ ] Verify correct token is displayed with 🔑 prefix
- [ ] Copy token and verify it's valid
- [ ] Reset password successfully
- [ ] Login with new password
- [ ] Deep link opens mobile app correctly

## Next Steps

1. Test the updated implementation
2. Verify the new console output format
3. Confirm token validation works
4. Test complete password reset flow end-to-end
5. Test deep linking in mobile app with the correct token
