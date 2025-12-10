# Password Reset Flow - Quick Reference

## How It Works

The password reset system uses **two different URLs**:

1. **Frontend URL** - Where the user goes to reset their password
2. **API Endpoints** - Where the frontend sends requests

### The Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. User clicks "Forgot Password" on your website/app        │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Frontend calls API:                                       │
│    POST http://localhost:3000/auth/password-reset/request   │
│    Body: { "email": "user@example.com" }                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. API generates secure token and sends email with link:    │
│    http://localhost:3000/reset-password?token=abc123...     │
│                                                              │
│    (This is your FRONTEND route, not an API endpoint!)      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. User clicks link in email                                │
│    Browser opens: http://localhost:3000/reset-password      │
│    Frontend reads token from URL query params               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. User enters new password in your frontend form           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Frontend submits to API:                                 │
│    POST http://localhost:3000/auth/password-reset/reset     │
│    Body: {                                                   │
│      "token": "abc123...",                                   │
│      "newPassword": "NewPassword123!"                        │
│    }                                                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. API updates password, revokes all sessions               │
│    Returns success                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. Frontend redirects user to login page                    │
└─────────────────────────────────────────────────────────────┘
```

## Important URLs

### API Endpoints (Backend)
```
POST http://localhost:3000/auth/password-reset/request
GET  http://localhost:3000/auth/password-reset/verify?token=xxx
POST http://localhost:3000/auth/password-reset/reset
```

### Frontend Routes (Your React/Mobile App)
```
http://localhost:3000/reset-password?token=xxx
```

## Environment Variable

The `FRONTEND_URL` determines where the email link points:

**Local Development:**
```bash
FRONTEND_URL=http://localhost:3000
```

**Production:**
```bash
FRONTEND_URL=https://yourdomain.com
```

## Email Link Example

When a user requests a password reset, they receive an email like this:

```
Subject: Reset Your Password

Hi John,

Click the button below to reset your password:
[Reset Password] → http://localhost:3000/reset-password?token=abc123xyz...

This link will expire in 1 hour.
```

**Important:** The link goes to your **frontend app**, NOT the API!

## Frontend Implementation Needed

You need to create a page at `/reset-password` in your frontend that:

### 1. Reads the token from URL
```typescript
// Example React component
const ResetPasswordPage = () => {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    // Get token from URL query params
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get('token');
    setToken(tokenFromUrl || '');
  }, []);

  // Rest of component...
}
```

### 2. Optional: Verify token is valid
```typescript
const verifyToken = async (token: string) => {
  const response = await fetch(
    `http://localhost:3000/auth/password-reset/verify?token=${token}`
  );

  if (response.ok) {
    const data = await response.json();
    console.log('Token is valid for:', data.email);
    return true;
  } else {
    console.log('Token is invalid or expired');
    return false;
  }
};
```

### 3. Submit new password to API
```typescript
const handleResetPassword = async () => {
  const response = await fetch('http://localhost:3000/auth/password-reset/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: token,
      newPassword: password
    })
  });

  if (response.ok) {
    // Success! Redirect to login
    navigate('/login');
  } else {
    // Show error message
    const error = await response.json();
    console.error(error.error);
  }
};
```

## Testing Without Frontend

If you don't have the frontend page yet, you can test the API directly:

### 1. Request password reset
```bash
curl -X POST http://localhost:3000/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@elearning.com"}'
```

### 2. Check console for the email
Look for output like:
```
📧 Email would be sent:
To: admin@elearning.com
Subject: Reset Your Password - E-Learning Platform
Body: ...
Email preview: ...

[Look for the reset token in the URL]
```

### 3. Copy the token from the console

### 4. Verify it (optional)
```bash
curl -X GET "http://localhost:3000/auth/password-reset/verify?token=YOUR_TOKEN_HERE"
```

### 5. Reset password
```bash
curl -X POST http://localhost:3000/auth/password-reset/reset \
  -H "Content-Type: application/json" \
  -d '{
    "token": "YOUR_TOKEN_HERE",
    "newPassword": "NewPassword123!"
  }'
```

### 6. Test login with new password
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@elearning.com",
    "password": "NewPassword123!"
  }'
```

## Common Issues

### "Route not found" error
**Problem:** You're trying to access `/reset-password` on the API server
**Solution:** This route should be on your frontend app, not the backend API

### Email link doesn't work
**Problem:** `FRONTEND_URL` not set correctly
**Solution:** Add to `.env.local`:
```
FRONTEND_URL=http://localhost:3000
```
(Or whatever port your frontend runs on)

### Token invalid/expired
**Problem:** Token expired (1 hour limit) or already used
**Solution:** Request a new password reset

## Summary

- **API handles:** Token generation, email sending, password updating
- **Frontend handles:** Displaying reset form, submitting new password
- **Email link:** Points to frontend (`/reset-password`), NOT the API
- **FRONTEND_URL:** Must match where your frontend app is running

The separation between frontend and API is intentional - it's a standard pattern for modern web applications!
