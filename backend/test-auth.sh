#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}E-Learning Platform Auth System Tests${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Test 1: Register a new user
echo -e "${YELLOW}Test 1: Register New User${NC}"
REGISTER_RESPONSE=$(curl -s -X POST $API_URL/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Test",
    "lastName": "User",
    "username": "testuser001",
    "email": "testuser001@example.com",
    "password": "Password123!"
  }')

echo "$REGISTER_RESPONSE" | jq '.'
USER_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.accessToken')
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.user.userId')

if [ "$USER_TOKEN" != "null" ]; then
  echo -e "${GREEN}✓ User registered successfully${NC}\n"
else
  echo -e "${RED}✗ User registration failed${NC}\n"
fi

sleep 1

# Test 2: Login as Super Admin
echo -e "${YELLOW}Test 2: Login as Super Admin${NC}"
ADMIN_LOGIN_RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@elearning.com",
    "password": "Admin123!"
  }')

echo "$ADMIN_LOGIN_RESPONSE" | jq '.'
ADMIN_TOKEN=$(echo "$ADMIN_LOGIN_RESPONSE" | jq -r '.accessToken')

if [ "$ADMIN_TOKEN" != "null" ]; then
  echo -e "${GREEN}✓ Super admin logged in successfully${NC}\n"
else
  echo -e "${RED}✗ Super admin login failed${NC}\n"
fi

sleep 1

# Test 3: Verify Token
echo -e "${YELLOW}Test 3: Verify User Token${NC}"
VERIFY_RESPONSE=$(curl -s -X GET $API_URL/auth/verify \
  -H "Authorization: Bearer $USER_TOKEN")

echo "$VERIFY_RESPONSE" | jq '.'

if [ "$(echo "$VERIFY_RESPONSE" | jq -r '.valid')" == "true" ]; then
  echo -e "${GREEN}✓ Token verified successfully${NC}\n"
else
  echo -e "${RED}✗ Token verification failed${NC}\n"
fi

sleep 1

# Test 4: Create School (User becomes Admin)
echo -e "${YELLOW}Test 4: Create School (User → Admin)${NC}"
SCHOOL_RESPONSE=$(curl -s -X POST $API_URL/schools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "name": "Test Academy",
    "description": "This is a test school created for testing purposes",
    "website": "https://testacademy.com"
  }')

echo "$SCHOOL_RESPONSE" | jq '.'
SCHOOL_ID=$(echo "$SCHOOL_RESPONSE" | jq -r '.schoolId')

if [ "$SCHOOL_ID" != "null" ]; then
  echo -e "${GREEN}✓ School created successfully${NC}\n"
else
  echo -e "${RED}✗ School creation failed${NC}\n"
fi

sleep 1

# Test 5: Get My School
echo -e "${YELLOW}Test 5: Get My School${NC}"
MY_SCHOOL_RESPONSE=$(curl -s -X GET $API_URL/schools/my-school \
  -H "Authorization: Bearer $USER_TOKEN")

echo "$MY_SCHOOL_RESPONSE" | jq '.'

if [ "$(echo "$MY_SCHOOL_RESPONSE" | jq -r '.schoolId')" != "null" ]; then
  echo -e "${GREEN}✓ Retrieved school successfully${NC}\n"
else
  echo -e "${RED}✗ Failed to retrieve school${NC}\n"
fi

sleep 1

# Test 6: List All Schools
echo -e "${YELLOW}Test 6: List All Schools${NC}"
LIST_SCHOOLS_RESPONSE=$(curl -s -X GET $API_URL/schools \
  -H "Authorization: Bearer $USER_TOKEN")

echo "$LIST_SCHOOLS_RESPONSE" | jq '.'

if [ "$(echo "$LIST_SCHOOLS_RESPONSE" | jq -r '.schools')" != "null" ]; then
  echo -e "${GREEN}✓ Listed schools successfully${NC}\n"
else
  echo -e "${RED}✗ Failed to list schools${NC}\n"
fi

sleep 1

# Test 7: Super Admin - Create User
echo -e "${YELLOW}Test 7: Super Admin - Create User${NC}"
ADMIN_CREATE_USER_RESPONSE=$(curl -s -X POST $API_URL/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{
    "firstName": "Admin",
    "lastName": "Created",
    "username": "admincreated001",
    "email": "admincreated001@example.com",
    "password": "Password123!",
    "roles": ["USER", "ADMIN"],
    "isEmailVerified": true
  }')

echo "$ADMIN_CREATE_USER_RESPONSE" | jq '.'
CREATED_USER_ID=$(echo "$ADMIN_CREATE_USER_RESPONSE" | jq -r '.userId')

if [ "$CREATED_USER_ID" != "null" ]; then
  echo -e "${GREEN}✓ User created by admin successfully${NC}\n"
else
  echo -e "${RED}✗ Failed to create user${NC}\n"
fi

sleep 1

# Test 8: Super Admin - List All Users
echo -e "${YELLOW}Test 8: Super Admin - List All Users${NC}"
LIST_USERS_RESPONSE=$(curl -s -X GET "$API_URL/admin/users?limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$LIST_USERS_RESPONSE" | jq '.'
USER_COUNT=$(echo "$LIST_USERS_RESPONSE" | jq -r '.count')

if [ "$USER_COUNT" != "null" ]; then
  echo -e "${GREEN}✓ Listed $USER_COUNT users successfully${NC}\n"
else
  echo -e "${RED}✗ Failed to list users${NC}\n"
fi

sleep 1

# Test 9: Super Admin - Create School for User
echo -e "${YELLOW}Test 9: Super Admin - Create School for User${NC}"
ADMIN_CREATE_SCHOOL_RESPONSE=$(curl -s -X POST $API_URL/admin/schools \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"name\": \"Admin Created School\",
    \"description\": \"This school was created by the super admin\",
    \"adminId\": \"$CREATED_USER_ID\",
    \"website\": \"https://adminschool.com\"
  }")

echo "$ADMIN_CREATE_SCHOOL_RESPONSE" | jq '.'
ADMIN_CREATED_SCHOOL_ID=$(echo "$ADMIN_CREATE_SCHOOL_RESPONSE" | jq -r '.schoolId')

if [ "$ADMIN_CREATED_SCHOOL_ID" != "null" ]; then
  echo -e "${GREEN}✓ School created by admin successfully${NC}\n"
else
  echo -e "${RED}✗ Failed to create school${NC}\n"
fi

sleep 1

# Test 10: Super Admin - List All Schools
echo -e "${YELLOW}Test 10: Super Admin - List All Schools${NC}"
ADMIN_LIST_SCHOOLS_RESPONSE=$(curl -s -X GET "$API_URL/admin/schools?limit=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$ADMIN_LIST_SCHOOLS_RESPONSE" | jq '.'
SCHOOL_COUNT=$(echo "$ADMIN_LIST_SCHOOLS_RESPONSE" | jq -r '.count')

if [ "$SCHOOL_COUNT" != "null" ]; then
  echo -e "${GREEN}✓ Listed $SCHOOL_COUNT schools successfully${NC}\n"
else
  echo -e "${RED}✗ Failed to list schools${NC}\n"
fi

sleep 1

# Test 11: Super Admin - Update User Roles
echo -e "${YELLOW}Test 11: Super Admin - Update User Roles${NC}"
UPDATE_ROLES_RESPONSE=$(curl -s -X PUT $API_URL/admin/users/roles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"roles\": [\"SUPER_ADMIN\", \"ADMIN\", \"USER\"]
  }")

echo "$UPDATE_ROLES_RESPONSE" | jq '.'

if [ "$(echo "$UPDATE_ROLES_RESPONSE" | jq -r '.message')" != "null" ]; then
  echo -e "${GREEN}✓ User roles updated successfully${NC}\n"
else
  echo -e "${RED}✗ Failed to update user roles${NC}\n"
fi

sleep 1

# Test 12: Update School
echo -e "${YELLOW}Test 12: Update School${NC}"
UPDATE_SCHOOL_RESPONSE=$(curl -s -X PUT $API_URL/schools/$SCHOOL_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "name": "Test Academy - Updated",
    "description": "Updated description for test school"
  }')

echo "$UPDATE_SCHOOL_RESPONSE" | jq '.'

if [ "$(echo "$UPDATE_SCHOOL_RESPONSE" | jq -r '.message')" != "null" ]; then
  echo -e "${GREEN}✓ School updated successfully${NC}\n"
else
  echo -e "${RED}✗ Failed to update school${NC}\n"
fi

sleep 1

# Test 13: Refresh Token
echo -e "${YELLOW}Test 13: Refresh Token${NC}"
REFRESH_RESPONSE=$(curl -s -X POST $API_URL/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$(echo "$REGISTER_RESPONSE" | jq -r '.refreshToken')\"
  }")

echo "$REFRESH_RESPONSE" | jq '.'
NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.accessToken')

if [ "$NEW_ACCESS_TOKEN" != "null" ]; then
  echo -e "${GREEN}✓ Token refreshed successfully${NC}\n"
else
  echo -e "${RED}✗ Failed to refresh token${NC}\n"
fi

sleep 1

# Summary
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test Summary${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "User Token: ${USER_TOKEN:0:50}..."
echo -e "Admin Token: ${ADMIN_TOKEN:0:50}..."
echo -e "User ID: $USER_ID"
echo -e "School ID: $SCHOOL_ID"
echo -e "Created User ID: $CREATED_USER_ID"
echo -e "Admin Created School ID: $ADMIN_CREATED_SCHOOL_ID"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${YELLOW}Note: Install 'jq' for better JSON formatting: brew install jq${NC}"
