# Mobile Password Reset Implementation

## Overview

The password reset functionality has been fully implemented in the mobile app. Users can now reset their password by clicking the link in the password reset email, which will open the mobile app directly to the reset password screen.

## Files Created

### 1. `/mobile/src/api/auth.ts`
Complete authentication API client with methods for:
- `register()` - User registration
- `login()` - User login
- `refreshToken()` - Refresh access token
- `requestPasswordReset()` - Request password reset email
- `verifyResetToken()` - Verify reset token is valid
- `resetPassword()` - Submit new password with token

### 2. `/mobile/src/screens/auth/ForgotPasswordScreen.tsx`
Screen where users can request a password reset:
- Email input field
- Validates email format
- Calls API to send reset email
- Shows success message
- Returns to login screen

### 3. `/mobile/src/screens/auth/ResetPasswordScreen.tsx`
Screen where users reset their password:
- Automatically reads token from URL parameters (deep linking)
- Verifies token on mount
- Password input with validation (8+ chars, 1 number, 1 special char)
- Confirm password field
- Shows helpful error messages
- Redirects to login on success

## Files Modified

### 1. `/mobile/App.tsx`
Added deep linking configuration and new screens:
- Imported `expo-linking` package
- Created `linking` configuration with multiple URL prefixes:
  - `exp://localhost:8081` (Expo dev server)
  - `http://localhost:3000` (local web)
  - `elearning://` (custom scheme)
  - Production domain
- Added `ForgotPassword` and `ResetPassword` screens to Stack Navigator
- Configured `ResetPassword` route to parse token from URL query params
- Added `linking` prop to NavigationContainer

### 2. `/mobile/package.json`
Added `expo-linking` dependency (version ~7.0.5)

## How It Works

### Password Reset Flow

```
1. User clicks "Forgot Password" in your app
   ↓
2. ForgotPasswordScreen: User enters email
   ↓
3. API sends email with reset link:
   http://localhost:3000/reset-password?token=abc123...
   (or exp://localhost:8081/--/reset-password?token=abc123...)
   ↓
4. User clicks link in email
   ↓
5. Mobile app opens via deep linking
   ↓
6. ResetPasswordScreen automatically:
   - Reads token from URL params
   - Verifies token with API
   - Shows password reset form
   ↓
7. User enters new password
   ↓
8. API updates password, revokes all sessions
   ↓
9. User redirected to login screen
```

## Deep Linking Configuration

The app responds to multiple URL formats:

### Development URLs
- `exp://localhost:8081/--/reset-password?token=xxx` (Expo Go)
- `http://localhost:3000/reset-password?token=xxx` (Web/Expo dev)

### Production URLs
- `elearning://reset-password?token=xxx` (Custom scheme)
- `https://yourdomain.com/reset-password?token=xxx` (Universal links)

## Testing the Implementation

### Step 1: Start the backend
```bash
cd backend
npm run dev
```

### Step 2: Start the mobile app
```bash
cd mobile
npm start
```

### Step 3: Test password reset

#### Option A: Using the test script
```bash
cd backend
chmod +x test-password-reset.sh
./test-password-reset.sh
```

#### Option B: Manual testing
1. In your mobile app, navigate to the "Forgot Password" screen
2. Enter email: `admin@elearning.com`
3. Check your backend console for the email output
4. Copy the reset token from the URL in the email
5. Manually construct the deep link:
   - Expo Go: `exp://localhost:8081/--/reset-password?token=YOUR_TOKEN`
   - Web: `http://localhost:3000/reset-password?token=YOUR_TOKEN`
6. Open the link (it should open the app)
7. Enter new password and submit

### Step 4: Verify login with new password
Try logging in with the new password to confirm it worked.

## Important Notes

### FRONTEND_URL Configuration

The backend `.env.local` file has:
```bash
FRONTEND_URL=http://localhost:3000
```

This works for local development with Expo because:
1. Expo dev server typically runs on port 8081
2. The deep linking prefixes include both `http://localhost:3000` and `exp://localhost:8081`
3. The React Navigation linking config maps both to the same screens

For production, update `FRONTEND_URL` to your actual domain.

### Email Link Formats

The backend sends an email with a link like:
```
http://localhost:3000/reset-password?token=abc123...
```

When opened on a device with the app installed:
- iOS/Android: The OS recognizes the URL and opens the app via deep linking
- Expo Go: You need to use `exp://` URLs for testing

### Expo Deep Link Testing

To test deep links in Expo Go during development:
```bash
# iOS
npx uri-scheme open "exp://localhost:8081/--/reset-password?token=YOUR_TOKEN" --ios

# Android
npx uri-scheme open "exp://localhost:8081/--/reset-password?token=YOUR_TOKEN" --android
```

## Navigation Structure

```
App
├── MainTabs (Tab Navigator)
│   ├── Home
│   ├── MyLearning
│   └── Profile
├── CourseDetail
├── CourseCurriculum
├── LessonPlayer
├── UploadVideo
├── ForgotPassword    ← New
└── ResetPassword     ← New
```

## API Endpoints Used

- `POST /auth/password-reset/request` - Request password reset
- `GET /auth/password-reset/verify?token=xxx` - Verify token (optional)
- `POST /auth/password-reset/reset` - Reset password with token

## Security Features

1. **Token Expiration**: Reset tokens expire after 1 hour
2. **Single Use**: Tokens can only be used once
3. **Secure Hashing**: Tokens are SHA-256 hashed in database
4. **Session Revocation**: All user sessions are revoked after password reset
5. **Password Validation**: Enforces 8+ chars, 1 number, 1 special char
6. **No Email Enumeration**: API always returns success, even for non-existent emails

## Troubleshooting

### "Route not found" error
- **Problem**: Email link not opening the app
- **Solution**: Make sure the app is running and deep linking is configured. Use Expo Go for development testing.

### Token invalid/expired
- **Problem**: Token validation fails
- **Solution**: Request a new password reset. Tokens expire after 1 hour.

### App doesn't open from link
- **Problem**: Deep linking not working
- **Solution**:
  - Check that `expo-linking` is installed
  - Verify the linking configuration in App.tsx
  - For Expo Go, use `exp://` URLs
  - For standalone apps, test with custom scheme `elearning://`

### Can't find ForgotPassword screen
- **Problem**: Navigation error
- **Solution**: Make sure you've imported the screens in App.tsx and added them to the Stack Navigator

## Next Steps

Consider adding these features:
1. Login screen with "Forgot Password?" link that navigates to ForgotPasswordScreen
2. Success animations on ResetPasswordScreen
3. Email verification before allowing password reset
4. Rate limiting on password reset requests
5. Password strength indicator UI
6. "Show/Hide" password toggle
