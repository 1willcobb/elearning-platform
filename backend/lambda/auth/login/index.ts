import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import Joi from 'joi';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { comparePassword } from '../../../shared/utils/password';
import { generateAccessToken } from '../../../shared/utils/jwt';
import { successResponse, errorResponse, validationErrorResponse } from '../../../shared/utils/response';
import { LoginRequest, TokenResponse } from '../../../shared/types/auth';
import { createSession } from '../../../shared/utils/session';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body: LoginRequest = JSON.parse(event.body || '{}');

    // Validate request
    const { error } = loginSchema.validate(body);
    if (error) {
      return validationErrorResponse(error.details);
    }

    const { email, password } = body;

    // Find user by email using GSI1
    const result = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :email',
        ExpressionAttributeValues: {
          ':email': `EMAIL#${email.toLowerCase()}`,
        },
        Limit: 1,
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return errorResponse('Invalid email or password', 401);
    }

    const user = result.Items[0];

    // Check if user is active
    if (!user.isActive) {
      return errorResponse('Account is inactive', 403);
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return errorResponse('Invalid email or password', 401);
    }

    // Generate access token
    const accessToken = generateAccessToken({
      userId: user.userId,
      email: user.email,
      username: user.username,
      roles: user.roles,
    });

    // Create session and get refresh token
    const { sessionId, refreshToken } = await createSession({
      userId: user.userId,
      email: user.email,
      userAgent: event.headers['User-Agent'] || event.headers['user-agent'],
      ip: event.requestContext?.identity?.sourceIp,
    });

    const response: TokenResponse = {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      user: {
        userId: user.userId,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
      },
    };

    return successResponse(response);
  } catch (error: any) {
    console.error('Login error:', error);
    return errorResponse(error.message || 'Login failed');
  }
};
