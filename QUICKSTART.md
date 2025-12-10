# Quick Start Guide - Authentication System

## 🚀 Get Started in 5 Minutes

### Step 1: Install Dependencies
```bash
cd elearning-platform/backend
npm install
```

### Step 2: Start Local Services (DynamoDB & MinIO)
```bash
npm run local:services
```

### Step 3: Initialize Database & Create Super Admin
```bash
npm run init:local
```

**Your Super Admin Credentials:**
- Email: `admin@elearning.com`
- Username: `superadmin`
- Password: `Admin123!`

### Step 4: Start the API
```bash
npm run local:api
```

API is now running at `http://localhost:3000`

## 🧪 Test Your Authentication

### Login as Super Admin
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@elearning.com",
    "password": "Admin123!"
  }'
```

**Copy the `accessToken` from the response!**

### Register a New User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "username": "testuser",
    "email": "test@example.com",
    "password": "Password123!"
  }'
```

### Create a School (Become Admin)
```bash
# Use the accessToken from registration
curl -X POST http://localhost:3000/schools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "name": "Test School",
    "description": "This is my test school for the platform"
  }'
```

### List All Schools
```bash
curl -X GET http://localhost:3000/schools \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 📋 Available Endpoints

### Public Endpoints (No Auth)
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login

### User Endpoints (Requires Auth)
- `POST /auth/refresh` - Refresh access token
- `GET /auth/verify` - Verify token
- `POST /schools` - Create school (become admin)
- `GET /schools` - List schools
- `GET /schools/{id}` - Get school details
- `GET /schools/my-school` - Get my school

### Admin Endpoints (Requires ADMIN role)
- `PUT /schools/{id}` - Update school
- `DELETE /schools/{id}` - Delete school

### Super Admin Endpoints (Requires SUPER_ADMIN role)
- `POST /admin/users` - Create user
- `POST /admin/schools` - Create school for user
- `POST /admin/enrollments` - Manual enrollment
- `PUT /admin/users/roles` - Update user roles
- `GET /admin/users` - List all users
- `GET /admin/schools` - List all schools
- `DELETE /admin/users/{id}` - Delete user

## 🔑 How Roles Work

1. **New User Registration** → Gets `USER` role
2. **User Creates School** → Automatically upgraded to `ADMIN` role (keeps `USER` too)
3. **Super Admin** → You (platform owner) with all permissions

## 📝 Super Admin Examples

### Create a User Manually
```bash
curl -X POST http://localhost:3000/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "password": "Password123!",
    "roles": ["USER", "ADMIN"]
  }'
```

### Create a School for a User
```bash
curl -X POST http://localhost:3000/admin/schools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -d '{
    "name": "New School",
    "description": "A new school created by super admin",
    "adminId": "USER_ID_HERE"
  }'
```

### List All Users
```bash
curl -X GET "http://localhost:3000/admin/users?limit=50" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN"
```

### Update User Roles
```bash
curl -X PUT http://localhost:3000/admin/users/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SUPER_ADMIN_TOKEN" \
  -d '{
    "userId": "USER_ID_HERE",
    "roles": ["SUPER_ADMIN", "ADMIN", "USER"]
  }'
```

## 🛑 Stopping Services

```bash
# Stop the API (Ctrl+C)

# Stop Docker services
cd backend
npm run local:services:stop
```

## 📚 Documentation

- **Full API Documentation:** See `backend/AUTH_SYSTEM.md`
- **Implementation Details:** See `IMPLEMENTATION_SUMMARY.md`
- **Code Examples:** Check the Lambda functions in `backend/lambda/`

## ⚠️ Important Notes

1. **Change Super Admin Password** - The default password `Admin123!` should be changed in production
2. **JWT Secrets** - Update `JWT_SECRET` and `JWT_REFRESH_SECRET` in production
3. **Email Verification** - Not yet implemented (coming soon)
4. **Password Reset** - Not yet implemented (coming soon)

## 🎯 What's Next?

1. Protect existing course/lesson endpoints with auth middleware
2. Build a super admin dashboard UI
3. Integrate with mobile app
4. Add email verification
5. Implement password reset
6. Add 2FA for super admin accounts

## 💡 Tips

- Access tokens expire in 1 hour
- Refresh tokens expire in 7 days
- Use refresh token to get new access tokens
- All passwords must have 8+ chars, 1 number, 1 special char
- Usernames and emails must be unique
- Each user can only create ONE school (super admin can create unlimited)

## 🐛 Troubleshooting

**API won't start?**
- Make sure Docker services are running: `npm run local:services`
- Check DynamoDB is accessible: `http://localhost:8000`

**Can't login?**
- Verify database was initialized: `npm run init:local`
- Check credentials exactly match: `admin@elearning.com` / `Admin123!`

**"User already exists" error?**
- Username or email is already taken
- Try a different username/email

**Authorization errors?**
- Make sure you're including the Authorization header
- Format: `Authorization: Bearer <your-token>`
- Check token hasn't expired (refresh if needed)

---

**Happy Coding! 🚀**
