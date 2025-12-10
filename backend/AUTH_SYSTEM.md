# Authentication & Authorization System

This document describes the comprehensive authentication and authorization system implemented for the e-learning platform.

## Overview

The system implements a three-tier permission model:
- **USER** - Regular users who can enroll in courses
- **ADMIN** - Users who have created a school and can manage their courses
- **SUPER_ADMIN** - Platform owner with full access to all resources

## User Roles

### USER (Default)
- Created automatically when a user registers
- Can browse courses, enroll in courses, track progress
- Can upgrade to ADMIN by creating a school

### ADMIN
- Automatically granted when a user creates a school
- Can manage their own school and courses
- Retains USER permissions
- One school per admin

### SUPER_ADMIN
- Platform owner (you!)
- Has all USER and ADMIN permissions
- Can manually create users, schools, and enrollments
- Can manage any resource in the system
- Can change user roles

## Authentication Flow

### 1. Registration
**Endpoint:** `POST /auth/register`

**Requirements:**
- First name (2-50 characters)
- Last name (2-50 characters)
- Username (3-30 alphanumeric characters, unique)
- Email (valid email, unique)
- Password (minimum 8 characters, at least 1 number, 1 special character)

**Response:**
```json
{
  "accessToken": "jwt-token",
  "refreshToken": "refresh-token",
  "expiresIn": 3600,
  "user": {
    "userId": "uuid",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["USER"]
  }
}
```

### 2. Login
**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password"
}
```

**Response:** Same as registration

### 3. Refresh Token
**Endpoint:** `POST /auth/refresh`

**Request:**
```json
{
  "refreshToken": "refresh-token"
}
```

**Response:** New access and refresh tokens

### 4. Verify Token
**Endpoint:** `GET /auth/verify`

**Headers:**
```
Authorization: Bearer <access-token>
```

**Response:**
```json
{
  "valid": true,
  "user": {
    "userId": "uuid",
    "email": "user@example.com",
    "username": "username",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["USER"]
  }
}
```

## School Management

### Create School (Become Admin)
**Endpoint:** `POST /schools`

**Headers:**
```
Authorization: Bearer <access-token>
```

**Request:**
```json
{
  "name": "My School",
  "description": "School description (10-500 characters)",
  "logo": "https://example.com/logo.png", // optional
  "website": "https://myschool.com" // optional
}
```

**Effect:** User's role is automatically upgraded to include ADMIN

### Get My School
**Endpoint:** `GET /schools/my-school`

**Headers:**
```
Authorization: Bearer <access-token>
```

### List All Schools
**Endpoint:** `GET /schools`

**Headers:**
```
Authorization: Bearer <access-token>
```

### Get School by ID
**Endpoint:** `GET /schools/{schoolId}`

**Headers:**
```
Authorization: Bearer <access-token>
```

### Update School
**Endpoint:** `PUT /schools/{schoolId}`

**Headers:**
```
Authorization: Bearer <access-token>
```

**Permissions:** School admin or super admin only

**Request:**
```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "logo": "https://example.com/new-logo.png",
  "website": "https://newsite.com",
  "status": "ACTIVE" // or "INACTIVE"
}
```

### Delete School
**Endpoint:** `DELETE /schools/{schoolId}`

**Headers:**
```
Authorization: Bearer <access-token>
```

**Permissions:** School admin or super admin only

## Super Admin Functions

### Create User Manually
**Endpoint:** `POST /admin/users`

**Headers:**
```
Authorization: Bearer <super-admin-access-token>
```

**Request:**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "username": "johndoe",
  "email": "john@example.com",
  "password": "Password123!",
  "roles": ["USER"], // optional, can be ["USER", "ADMIN", "SUPER_ADMIN"]
  "isActive": true, // optional, default true
  "isEmailVerified": false // optional, default false
}
```

### Create School Manually
**Endpoint:** `POST /admin/schools`

**Headers:**
```
Authorization: Bearer <super-admin-access-token>
```

**Request:**
```json
{
  "name": "New School",
  "description": "School description",
  "adminId": "user-uuid",
  "logo": "https://example.com/logo.png", // optional
  "website": "https://school.com", // optional
  "status": "ACTIVE" // optional, default ACTIVE
}
```

**Effect:** The specified user is automatically granted ADMIN role

### Manual Enrollment
**Endpoint:** `POST /admin/enrollments`

**Headers:**
```
Authorization: Bearer <super-admin-access-token>
```

**Request:**
```json
{
  "userId": "user-uuid",
  "courseId": "course-uuid",
  "amountPaid": 0, // optional, default 0
  "currency": "USD" // optional, default USD
}
```

### Update User Roles
**Endpoint:** `PUT /admin/users/roles`

**Headers:**
```
Authorization: Bearer <super-admin-access-token>
```

**Request:**
```json
{
  "userId": "user-uuid",
  "roles": ["USER", "ADMIN", "SUPER_ADMIN"]
}
```

### List All Users
**Endpoint:** `GET /admin/users?role=USER&limit=100&lastKey=xxx`

**Headers:**
```
Authorization: Bearer <super-admin-access-token>
```

**Query Parameters:**
- `role` (optional) - Filter by role (USER, ADMIN, SUPER_ADMIN)
- `limit` (optional) - Number of results (default 100)
- `lastKey` (optional) - For pagination

### List All Schools
**Endpoint:** `GET /admin/schools?status=ACTIVE&limit=100&lastKey=xxx`

**Headers:**
```
Authorization: Bearer <super-admin-access-token>
```

**Query Parameters:**
- `status` (optional) - Filter by status (ACTIVE, INACTIVE)
- `limit` (optional) - Number of results (default 100)
- `lastKey` (optional) - For pagination

### Delete User
**Endpoint:** `DELETE /admin/users/{userId}`

**Headers:**
```
Authorization: Bearer <super-admin-access-token>
```

**Effect:** Deletes user and all associated data (enrollments, progress, settings)

## Database Schema

### User Entity
```
PK: USER#<userId>
SK: METADATA
{
  userId: string
  email: string (lowercase)
  username: string (lowercase)
  firstName: string
  lastName: string
  passwordHash: string (bcrypt)
  roles: ['USER'] | ['USER', 'ADMIN'] | ['SUPER_ADMIN', 'ADMIN', 'USER']
  isActive: boolean
  isEmailVerified: boolean
  createdAt: ISO string
  updatedAt: ISO string
  GSI1PK: EMAIL#<email>
  GSI1SK: USER#<userId>
  GSI2PK: ROLE#<primary-role>
  GSI2SK: USER#<userId>
}
```

### Username Mapping
```
PK: USERNAME#<username>
SK: METADATA
{
  userId: string
  username: string
  createdAt: ISO string
}
```

### Email Mapping
```
PK: EMAIL#<email>
SK: METADATA
{
  userId: string
  email: string
  createdAt: ISO string
}
```

### School Entity
```
PK: SCHOOL#<schoolId>
SK: METADATA
{
  schoolId: string
  name: string
  description: string
  logo: string | null
  website: string | null
  adminId: string
  adminName: string
  status: 'ACTIVE' | 'INACTIVE'
  courseIds: string[]
  totalCourses: number
  totalStudents: number
  createdAt: ISO string
  updatedAt: ISO string
  GSI1PK: SCHOOLS
  GSI1SK: SCHOOL#<schoolId>
  GSI2PK: ADMIN#<adminId>
  GSI2SK: SCHOOL#<schoolId>
}
```

## Super Admin Credentials (Local Development)

**Email:** admin@elearning.com
**Username:** superadmin
**Password:** Admin123!

⚠️ **IMPORTANT:** Change these credentials in production!

## Security Features

1. **Password Requirements:**
   - Minimum 8 characters
   - At least 1 number
   - At least 1 special character
   - Hashed with bcrypt (10 rounds)

2. **JWT Tokens:**
   - Access token: 1 hour expiry
   - Refresh token: 7 days expiry
   - Both signed with separate secrets

3. **Authentication Middleware:**
   - `requireUser` - Any authenticated user
   - `requireAdmin` - Admin or super admin only
   - `requireSuperAdmin` - Super admin only

4. **Authorization Checks:**
   - School admins can only manage their own school
   - Super admins can manage any resource
   - Users can only access their own data

## Environment Variables

Required environment variables:
```
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
AWS_REGION=us-east-1
STAGE=local|preprod|prod
TABLE_NAME=ELearningPlatform-<stage>
```

## Testing the System

1. **Start local services:**
   ```bash
   cd backend
   npm run local:services
   ```

2. **Initialize database and seed super admin:**
   ```bash
   npm run init:local
   ```

3. **Start API:**
   ```bash
   npm run local:api
   ```

4. **Test endpoints:**
   ```bash
   # Register a new user
   curl -X POST http://localhost:3000/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "firstName": "John",
       "lastName": "Doe",
       "username": "johndoe",
       "email": "john@example.com",
       "password": "Password123!"
     }'

   # Login as super admin
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "admin@elearning.com",
       "password": "Admin123!"
     }'
   ```

## Next Steps

- Implement password reset functionality
- Add email verification
- Implement 2FA
- Add rate limiting
- Add audit logging for admin actions
- Implement refresh token rotation
- Add session management
