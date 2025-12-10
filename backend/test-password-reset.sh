#!/bin/bash

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000"
TEST_EMAIL="admin@elearning.com"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Password Reset Flow Test${NC}"
echo -e "${GREEN}========================================${NC}\n"

# Step 1: Request password reset
echo -e "${YELLOW}Step 1: Request password reset for ${TEST_EMAIL}${NC}"
RESET_RESPONSE=$(curl -s -X POST $API_URL/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\"}")

echo "$RESET_RESPONSE" | jq '.'
echo ""

echo -e "${BLUE}📧 Check your console/terminal where the API is running!${NC}"
echo -e "${BLUE}Look for the email output and find the reset token.${NC}"
echo -e "${BLUE}The token will be in a URL like:${NC}"
echo -e "${BLUE}http://localhost:3000/reset-password?token=XXXXXXXXX${NC}\n"

# Prompt for token
echo -e "${YELLOW}Step 2: Enter the reset token from the email:${NC}"
read -p "Token: " RESET_TOKEN

if [ -z "$RESET_TOKEN" ]; then
  echo -e "${RED}❌ No token provided. Exiting.${NC}"
  exit 1
fi

echo ""

# Step 3: Verify token (optional)
echo -e "${YELLOW}Step 3: Verify token is valid${NC}"
VERIFY_RESPONSE=$(curl -s -X GET "$API_URL/auth/password-reset/verify?token=$RESET_TOKEN")

echo "$VERIFY_RESPONSE" | jq '.'

if echo "$VERIFY_RESPONSE" | jq -e '.valid == true' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Token is valid!${NC}\n"
else
  echo -e "${RED}❌ Token is invalid or expired!${NC}\n"
  exit 1
fi

# Step 4: Reset password
NEW_PASSWORD="NewPassword123!"
echo -e "${YELLOW}Step 4: Reset password to: ${NEW_PASSWORD}${NC}"
RESET_PASSWORD_RESPONSE=$(curl -s -X POST $API_URL/auth/password-reset/reset \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$RESET_TOKEN\",
    \"newPassword\": \"$NEW_PASSWORD\"
  }")

echo "$RESET_PASSWORD_RESPONSE" | jq '.'

if echo "$RESET_PASSWORD_RESPONSE" | jq -e '.message' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Password reset successful!${NC}\n"
else
  echo -e "${RED}❌ Password reset failed!${NC}\n"
  exit 1
fi

# Step 5: Test login with new password
echo -e "${YELLOW}Step 5: Test login with new password${NC}"
LOGIN_RESPONSE=$(curl -s -X POST $API_URL/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$NEW_PASSWORD\"
  }")

echo "$LOGIN_RESPONSE" | jq '.'

if echo "$LOGIN_RESPONSE" | jq -e '.accessToken' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Login successful with new password!${NC}\n"
else
  echo -e "${RED}❌ Login failed!${NC}\n"
  exit 1
fi

# Step 6: Reset back to original password
echo -e "${YELLOW}Step 6: Resetting password back to Admin123!${NC}"
echo -e "${BLUE}Requesting new reset token...${NC}"

RESET_RESPONSE_2=$(curl -s -X POST $API_URL/auth/password-reset/request \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$TEST_EMAIL\"}")

echo -e "${BLUE}Check console for the new token and press Enter when ready...${NC}"
read -p ""

echo -e "${YELLOW}Enter the new reset token:${NC}"
read -p "Token: " RESET_TOKEN_2

if [ -z "$RESET_TOKEN_2" ]; then
  echo -e "${RED}❌ No token provided. Skipping reset back to original.${NC}"
else
  RESET_BACK_RESPONSE=$(curl -s -X POST $API_URL/auth/password-reset/reset \
    -H "Content-Type: application/json" \
    -d "{
      \"token\": \"$RESET_TOKEN_2\",
      \"newPassword\": \"Admin123!\"
    }")

  if echo "$RESET_BACK_RESPONSE" | jq -e '.message' > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Password reset back to Admin123!${NC}\n"
  else
    echo -e "${RED}❌ Failed to reset back to original password${NC}\n"
  fi
fi

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Password Reset Test Complete!${NC}"
echo -e "${GREEN}========================================${NC}\n"

echo -e "${BLUE}Key Points:${NC}"
echo -e "1. The email link points to: ${YELLOW}http://localhost:3000/reset-password?token=xxx${NC}"
echo -e "2. This is your ${YELLOW}FRONTEND${NC} route, not an API endpoint"
echo -e "3. Your frontend needs to:"
echo -e "   - Display a password reset form at /reset-password"
echo -e "   - Read the token from URL query params"
echo -e "   - Submit to API: POST /auth/password-reset/reset"
echo -e "4. In local dev, emails are logged to console"
echo -e "5. All sessions are revoked after password reset (security feature)\n"
