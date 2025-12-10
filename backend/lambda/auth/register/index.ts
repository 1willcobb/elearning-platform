import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { hashPassword, validatePasswordStrength } from '../../../shared/utils/password';
import { generateAccessToken } from '../../../shared/utils/jwt';
import { successResponse, errorResponse, validationErrorResponse } from '../../../shared/utils/response';
import { UserRole, RegisterRequest, TokenResponse } from '../../../shared/types/auth';
import { createSession } from '../../../shared/utils/session';
import { sendWelcomeEmail } from '../../../shared/utils/email';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const registerSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  username: Joi.string().min(3).max(30).alphanum().required(),
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body: RegisterRequest = JSON.parse(event.body || '{}');

    // Validate request
    const { error } = registerSchema.validate(body);
    if (error) {
      return validationErrorResponse(error.details);
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(body.password);
    if (!passwordValidation.valid) {
      return errorResponse(passwordValidation.message || 'Invalid password', 400);
    }

    const { firstName, lastName, username, email, password } = body;

    // Check if username already exists
    const usernameCheck = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `USERNAME#${username.toLowerCase()}`,
          SK: 'METADATA',
        },
      })
    );

    if (usernameCheck.Item) {
      return errorResponse('Username already exists', 409);
    }

    // Check if email already exists
    const emailCheck = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `EMAIL#${email.toLowerCase()}`,
          SK: 'METADATA',
        },
      })
    );

    if (emailCheck.Item) {
      return errorResponse('Email already exists', 409);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const userId = uuidv4();
    const now = new Date().toISOString();

    const userItem = {
      PK: `USER#${userId}`,
      SK: 'METADATA',
      EntityType: 'User',
      userId,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      firstName,
      lastName,
      passwordHash: hashedPassword,
      roles: [UserRole.USER],
      isActive: true,
      isEmailVerified: false,
      createdAt: now,
      updatedAt: now,
      GSI1PK: `EMAIL#${email.toLowerCase()}`,
      GSI1SK: `USER#${userId}`,
      GSI2PK: `ROLE#${UserRole.USER}`,
      GSI2SK: `USER#${userId}`,
    };

    // Create username mapping
    const usernameItem = {
      PK: `USERNAME#${username.toLowerCase()}`,
      SK: 'METADATA',
      EntityType: 'UsernameMapping',
      userId,
      username: username.toLowerCase(),
      createdAt: now,
    };

    // Create email mapping
    const emailItem = {
      PK: `EMAIL#${email.toLowerCase()}`,
      SK: 'METADATA',
      EntityType: 'EmailMapping',
      userId,
      email: email.toLowerCase(),
      createdAt: now,
    };

    // Store all items
    await Promise.all([
      docClient.send(new PutCommand({ TableName: tableName, Item: userItem })),
      docClient.send(new PutCommand({ TableName: tableName, Item: usernameItem })),
      docClient.send(new PutCommand({ TableName: tableName, Item: emailItem })),
    ]);

    // Generate access token
    const accessToken = generateAccessToken({
      userId,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      roles: [UserRole.USER],
    });

    // Create session and get refresh token
    const { sessionId, refreshToken } = await createSession({
      userId,
      email: email.toLowerCase(),
      userAgent: event.headers['User-Agent'] || event.headers['user-agent'],
      ip: event.requestContext?.identity?.sourceIp,
    });

    // Send welcome email (async, don't wait)
    sendWelcomeEmail(email.toLowerCase(), firstName).catch((error) => {
      console.error('Failed to send welcome email:', error);
    });

    const response: TokenResponse = {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      user: {
        userId,
        email: email.toLowerCase(),
        username: username.toLowerCase(),
        firstName,
        lastName,
        roles: [UserRole.USER],
      },
    };

    return successResponse(response, 201);
  } catch (error: any) {
    console.error('Registration error:', error);
    return errorResponse(error.message || 'Registration failed');
  }
};
