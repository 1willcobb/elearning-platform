# How to Copy the Reset Token for Testing

## The Problem

When the backend sends a password reset email locally, it outputs the email in two formats:
1. **Plain text** (correct token)
2. **HTML preview** (URL-encoded token with `3D` prefix)

The HTML preview uses quoted-printable encoding, which adds `3D` (the encoded `=` character) to URLs. This is normal for email encoding but causes issues when manually copying tokens for testing.

## The Solution

The backend now clearly displays the token to use for testing at the top of the email output.

### Example Output

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

## How to Test

### Option 1: Copy the token directly (RECOMMENDED)
Look for this line in your backend console:
```
🔑 RESET TOKEN (copy this): e6b8520e726fc292ef343dc7385b782219f88dd9afe7d06cb0b48ad18e71e71c
```

Copy the 64-character hexadecimal token shown.

### Option 2: Copy from the plain text body
In the "Body:" section (plain text), find the line:
```
http://localhost:3000/reset-password?token=e6b8520e726fc292ef343dc7385b782219f88dd9afe7d06cb0b48ad18e71e71c
```

Copy just the token part (after `token=`).

### ❌ DO NOT copy from the HTML preview
The HTML preview section shows URLs like this:
```
token=3De6b8520e726fc292ef343dc7385b782219f88dd9afe7d06cb0b48ad18e71e71c
```

Notice the `3D` at the beginning - this is wrong! This is the URL-encoded version and won't work.

## Why This Happens

Email clients use quoted-printable encoding for HTML emails. The `=` character is special in this encoding, so it gets converted to `=3D`. When you see `token=3D...`, it means:
- `token=` (the parameter name)
- `=3D` (the encoded equals sign)
- `e6b85...` (the actual token)

The decoded version is: `token=e6b85...`

## Testing with the Script

The test script now handles this automatically:

```bash
cd backend
./test-password-reset.sh
```

When prompted for the token:
1. Look at your backend console output
2. Find the line that says: `🔑 RESET TOKEN (copy this):`
3. Copy the 64-character token
4. Paste it when prompted

## Token Format

A valid reset token:
- Is exactly 64 characters long
- Contains only lowercase letters (a-f) and numbers (0-9)
- Example: `e6b8520e726fc292ef343dc7385b782219f88dd9afe7d06cb0b48ad18e71e71c`

An invalid (URL-encoded) token:
- Has `3D` at the beginning or middle
- Example: `3De6b8520e726fc292ef343dc7385b782219f88dd9afe7d06cb0b48ad18e71e71c` ❌

## For Production

In production with real email delivery (AWS SES or other SMTP services):
- Email clients automatically handle the decoding
- Users click the link and it works correctly
- This issue only affects local development when copying tokens from console output
