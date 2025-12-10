import { APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { hashPassword } from '../../../shared/utils/password';
import { successResponse, errorResponse, validationErrorResponse } from '../../../shared/utils/response';
import { requireSuperAdmin, AuthenticatedEvent } from '../../../shared/middleware/auth';
import { UserRole } from '../../../shared/types/auth';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const createUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).required(),
  lastName: Joi.string().min(2).max(50).required(),
  username: Joi.string().min(3).max(30).alphanum().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  roles: Joi.array().items(Joi.string().valid(...Object.values(UserRole))).default([UserRole.USER]),
  isActive: Joi.boolean().default(true),
  isEmailVerified: Joi.boolean().default(false),
});

const handlerLogic = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');

    // Validate request
    const { error, value } = createUserSchema.validate(body);
    if (error) {
      return validationErrorResponse(error.details);
    }

    const { firstName, lastName, username, email, password, roles, isActive, isEmailVerified } = value;

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

    const userId = uuidv4();
    const now = new Date().toISOString();

    // Create user
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
      roles,
      isActive,
      isEmailVerified,
      createdAt: now,
      updatedAt: now,
      createdBy: event.user!.userId,
      GSI1PK: `EMAIL#${email.toLowerCase()}`,
      GSI1SK: `USER#${userId}`,
      GSI2PK: `ROLE#${roles[0]}`,
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

    return successResponse({
      userId,
      email: email.toLowerCase(),
      username: username.toLowerCase(),
      firstName,
      lastName,
      roles,
      isActive,
      isEmailVerified,
      createdAt: now,
      message: 'User created successfully by super admin',
    }, 201);
  } catch (error: any) {
    console.error('Admin create user error:', error);
    return errorResponse(error.message || 'Failed to create user');
  }
};

export const handler = requireSuperAdmin(handlerLogic);
