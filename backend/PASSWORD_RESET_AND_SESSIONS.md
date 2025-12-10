# Password Reset & Session Management

This document describes the password reset and session management features added to the e-learning platform.

## Table of Contents
- [Password Reset Flow](#password-reset-flow)
- [Session Management](#session-management)
- [API Endpoints](#api-endpoints)
- [Security Features](#security-features)
- [Testing](#testing)

## Password Reset Flow

### Overview
Users can reset their password through a secure email-based flow:

1. User requests password reset
2. System sends reset link via email
3. User clicks link and enters new password
4. Password is updated and all sessions are revoked

### Step-by-Step Process

#### 1. Request Password Reset
**Endpoint:** `POST /auth/password-reset/request`

**Request:**
```json
{
  "email": "user@example.com"
}
```

**Response:**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

**Notes:**
- Always returns success to prevent email enumeration attacks
- Sends email only if account exists and is active
- Reset token valid for 1 hour
- Token is hashed before storage for security

**Email Example:**
```
Subject: Reset Your Password - E-Learning Platform

Hi John,

We received a request to reset your password for your E-Learning Platform account.

Click the button below to reset your password:
[Reset Password Button → http://localhost:3000/reset-password?token=abc123...]

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email.
```

#### 2. Verify Reset Token (Optional)
**Endpoint:** `GET /auth/password-reset/verify?token=<token>`

**Response (Valid Token):**
```json
{
  "valid": true,
  "email": "user@example.com",
  "message": "Reset token is valid"
}
```

**Response (Invalid/Expired Token):**
```json
{
  "error": "Invalid or expired reset token"
}
```

#### 3. Reset Password
**Endpoint:** `POST /auth/password-reset/reset`

**Request:**
```json
{
  "token": "reset-token-from-email",
  "newPassword": "NewPassword123!"
}
```

**Response:**
```json
{
  "message": "Password reset successfully. All sessions have been revoked for security."
}
```

**Security Actions:**
- Password is validated (8+ chars, 1 number, 1 special char)
- Old password hash is replaced
- Reset token is marked as used
- **All active sessions are revoked** (user must login again on all devices)
- Confirmation email is sent

## Session Management

### Overview
The system tracks all active user sessions across devices. Each login creates a new session with:
- Unique session ID
- Refresh token (rotated on each use)
- Device information (user agent, IP, platform)
- Creation and last used timestamps
- Expiration time (7 days)

### Session Lifecycle

#### 1. Session Creation
Sessions are automatically created on:
- **User Registration:** Creates first session
- **User Login:** Creates new session for that device

**Session Data:**
```json
{
  "sessionId": "abc123...",
  "userId": "user-id",
  "refreshToken": "refresh-token",
  "deviceInfo": {
    "userAgent": "Mozilla/5.0...",
    "ip": "192.168.1.1",
    "platform": "macOS"
  },
  "createdAt": "2025-12-09T12:00:00Z",
  "lastUsedAt": "2025-12-09T13:30:00Z",
  "expiresAt": "2025-12-16T12:00:00Z",
  "isActive": true
}
```

#### 2. Session Rotation
**Refresh Token Rotation** (Enhanced Security):
- Each time a refresh token is used, a new one is generated
- Old refresh token is immediately invalidated
- Prevents token replay attacks
- Session's `lastUsedAt` timestamp is updated

**Endpoint:** `POST /auth/refresh`

**Request:**
```json
{
  "refreshToken": "current-refresh-token"
}
```

**Response:**
```json
{
  "accessToken": "new-access-token",
  "refreshToken": "new-refresh-token",
  "expiresIn": 3600,
  "user": {
    "userId": "user-id",
    "email": "user@example.com",
    ...
  }
}
```

#### 3. List Active Sessions
**Endpoint:** `GET /sessions?currentSessionId=<optional>`

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "sessions": [
    {
      "sessionId": "session-1",
      "deviceInfo": {
        "platform": "macOS",
        "userAgent": "Mozilla...",
        "ip": "192.168.1.1"
      },
      "createdAt": "2025-12-09T12:00:00Z",
      "lastUsedAt": "2025-12-09T13:30:00Z",
      "expiresAt": "2025-12-16T12:00:00Z",
      "isActive": true,
      "isCurrent": true
    },
    {
      "sessionId": "session-2",
      "deviceInfo": {
        "platform": "iPhone",
        "userAgent": "Mozilla...",
        "ip": "192.168.1.2"
      },
      "createdAt": "2025-12-08T10:00:00Z",
      "lastUsedAt": "2025-12-09T09:00:00Z",
      "expiresAt": "2025-12-15T10:00:00Z",
      "isActive": true,
      "isCurrent": false
    }
  ],
  "count": 2
}
```

**Features:**
- Automatically cleans up expired sessions before returning results
- Sorted by `lastUsedAt` (most recent first)
- Marks current session (if `currentSessionId` provided)
- Shows platform, last used time, and location info

#### 4. Revoke Single Session
**Endpoint:** `DELETE /sessions/{sessionId}`

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "message": "Session revoked successfully",
  "sessionId": "session-id"
}
```

**Use Cases:**
- Log out from a specific device
- Remove suspicious session
- Clean up old sessions

#### 5. Revoke All Sessions
**Endpoint:** `DELETE /sessions`

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "message": "All sessions revoked successfully"
}
```

**Use Cases:**
- Emergency logout from all devices
- Security breach response
- Account compromise recovery

**⚠️ Note:** This will log you out everywhere, including the current device!

## API Endpoints Summary

### Password Reset
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| POST | `/auth/password-reset/request` | No | Request password reset email |
| GET | `/auth/password-reset/verify?token=<token>` | No | Verify reset token validity |
| POST | `/auth/password-reset/reset` | No | Reset password with token |

### Session Management
| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| GET | `/sessions` | Yes (User) | List all active sessions |
| DELETE | `/sessions/{sessionId}` | Yes (User) | Revoke specific session |
| DELETE | `/sessions` | Yes (User) | Revoke all sessions |

### Updated Auth Endpoints
| Method | Endpoint | Changes |
|--------|----------|---------|
| POST | `/auth/register` | Now creates session and sends welcome email |
| POST | `/auth/login` | Now creates session with device tracking |
| POST | `/auth/refresh` | Now uses session rotation for enhanced security |

## Security Features

### 1. Password Reset Security
- **Email Enumeration Prevention:** Always returns success message
- **Token Hashing:** Reset tokens are hashed (SHA-256) before storage
- **Short Expiration:** Tokens expire after 1 hour
- **Single Use:** Tokens can only be used once
- **Session Revocation:** All sessions revoked after password reset
- **Secure Random Tokens:** 32 bytes (64 hex characters)

### 2. Session Security
- **Refresh Token Rotation:** New token on each refresh
- **Automatic Expiration:** Sessions expire after 7 days
- **Expired Session Cleanup:** Auto-removed when listing sessions
- **Device Tracking:** Monitor login locations and devices
- **IP Logging:** Track source IPs for security audit
- **Manual Revocation:** Users can revoke any session

### 3. Email Security
- **Local Development:** Emails logged to console (not sent)
- **Production:** Uses AWS SES with verified sender
- **HTML + Text:** Both formats included
- **No Sensitive Data:** Tokens only in links, not email body
- **Professional Templates:** Branded emails with clear CTAs

## Database Schema

### Password Reset Token
```
PK: RESET_TOKEN#<hashed-token>
SK: METADATA
{
  token: string (SHA-256 hash)
  userId: string
  email: string
  createdAt: ISO string
  expiresAt: ISO string
  used: boolean
  usedAt?: ISO string
  GSI1PK: USER#<userId>#RESET_TOKENS
  GSI1SK: TOKEN#<createdAt>
}
```

### Session
```
PK: USER#<userId>
SK: SESSION#<sessionId>
{
  sessionId: string
  userId: string
  refreshToken: string
  deviceInfo: {
    userAgent?: string
    ip?: string
    platform?: string
  }
  createdAt: ISO string
  lastUsedAt: ISO string
  expiresAt: ISO string
  isActive: boolean
  GSI1PK: SESSION#<sessionId>
  GSI1SK: USER#<userId>
}
```

## Testing

### Test Password Reset Flow

```bash
# 1. Request password reset
curl -X POST http://localhost:3000/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@elearning.com"
  }'

# Check console for email with reset token

# 2. Verify token (optional)
curl -X GET "http://localhost:3000/auth/password-reset/verify?token=<token-from-email>"

# 3. Reset password
curl -X POST http://localhost:3000/auth/password-reset/reset \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<token-from-email>",
    "newPassword": "NewPassword123!"
  }'

# 4. Login with new password
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@elearning.com",
    "password": "NewPassword123!"
  }'
```

### Test Session Management

```bash
# 1. Login and get access token
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@elearning.com",
    "password": "Admin123!"
  }')

ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken')

# 2. List sessions
curl -X GET http://localhost:3000/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 3. Login from another "device" (creates second session)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "User-Agent: iPhone" \
  -d '{
    "email": "admin@elearning.com",
    "password": "Admin123!"
  }'

# 4. List sessions again (should see 2)
curl -X GET http://localhost:3000/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 5. Revoke specific session
curl -X DELETE http://localhost:3000/sessions/<session-id> \
  -H "Authorization: Bearer $ACCESS_TOKEN"

# 6. Revoke all sessions
curl -X DELETE http://localhost:3000/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

### Test Refresh Token Rotation

```bash
# 1. Login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@elearning.com",
    "password": "Admin123!"
  }')

REFRESH_TOKEN_1=$(echo "$LOGIN_RESPONSE" | jq -r '.refreshToken')

# 2. Refresh (get new tokens)
REFRESH_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN_1\"
  }")

REFRESH_TOKEN_2=$(echo "$REFRESH_RESPONSE" | jq -r '.refreshToken')

echo "First refresh token: $REFRESH_TOKEN_1"
echo "Second refresh token: $REFRESH_TOKEN_2"
echo "Tokens should be different!"

# 3. Try to use old refresh token (should fail)
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN_1\"
  }"
# Should return error: "Session not found or expired"
```

## Environment Variables

Add to `.env.local`:

```
# Email Configuration
FROM_EMAIL=noreply@elearning.com
FRONTEND_URL=http://localhost:3000

# JWT Secrets (already configured)
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
```

For production:
- Configure AWS SES and verify sender email
- Update `FRONTEND_URL` to production URL
- Use strong, unique JWT secrets

## Frontend Integration

### Password Reset Page

```typescript
// /reset-password page
const ResetPasswordPage = () => {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get('token') || '');
  }, []);

  const handleReset = async () => {
    const response = await fetch('/auth/password-reset/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword: password })
    });

    if (response.ok) {
      // Redirect to login
      navigate('/login');
    }
  };

  return (
    <form onSubmit={handleReset}>
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button>Reset Password</button>
    </form>
  );
};
```

### Session Management UI

```typescript
const SessionsPage = () => {
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    fetch('/sessions', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })
      .then(res => res.json())
      .then(data => setSessions(data.sessions));
  }, []);

  const revokeSession = async (sessionId: string) => {
    await fetch(`/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    // Refresh list
    loadSessions();
  };

  return (
    <div>
      {sessions.map(session => (
        <div key={session.sessionId}>
          <p>{session.deviceInfo.platform}</p>
          <p>Last used: {session.lastUsedAt}</p>
          <button onClick={() => revokeSession(session.sessionId)}>
            Revoke
          </button>
        </div>
      ))}
    </div>
  );
};
```

## Troubleshooting

### Emails Not Sending (Local)
- **Expected Behavior:** Emails are logged to console in local development
- **Check:** Look for email content in your terminal where the API is running
- **Production:** Configure AWS SES and verify sender email address

### Reset Token Invalid
- **Check Expiration:** Tokens expire after 1 hour
- **Single Use:** Each token can only be used once
- **Correct Format:** Ensure token is the full string from the email link

### Session Not Found
- **Expired:** Sessions expire after 7 days
- **Revoked:** User or system may have revoked the session
- **Rotation:** Old refresh tokens invalid after rotation (by design)

### Password Reset Not Working
- **Account Inactive:** Only active accounts can reset passwords
- **Email Case:** Emails are case-insensitive and stored lowercase
- **Password Validation:** Must meet strength requirements

## Next Steps

- [ ] Implement 2FA for additional security
- [ ] Add suspicious login detection
- [ ] Email verification on registration
- [ ] Rate limiting on password reset requests
- [ ] Audit log for session activities
- [ ] Push notifications for new logins
- [ ] Remember this device option
