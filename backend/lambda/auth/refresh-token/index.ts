import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import Joi from 'joi';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { verifyRefreshToken, generateAccessToken } from '../../../shared/utils/jwt';
import { successResponse, errorResponse, validationErrorResponse, unauthorizedResponse } from '../../../shared/utils/response';
import { TokenResponse } from '../../../shared/types/auth';
import { getSessionByRefreshToken, rotateRefreshToken, revokeSession } from '../../../shared/utils/session';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');

    // Validate request
    const { error } = refreshSchema.validate(body);
    if (error) {
      return validationErrorResponse(error.details);
    }

    const { refreshToken } = body;

    // Verify refresh token
    let tokenPayload;
    try {
      tokenPayload = verifyRefreshToken(refreshToken);
    } catch (err) {
      return unauthorizedResponse('Invalid or expired refresh token');
    }

    // Get session by refresh token
    const session = await getSessionByRefreshToken(refreshToken);

    if (!session) {
      return unauthorizedResponse('Session not found or expired');
    }

    // Check if session is active
    if (!session.isActive) {
      return unauthorizedResponse('Session is inactive');
    }

    // Check if session has expired
    const expiresAt = new Date(session.expiresAt);
    if (expiresAt < new Date()) {
      // Session expired, revoke it
      await revokeSession(session.userId, session.sessionId);
      return unauthorizedResponse('Session has expired');
    }

    // Get user from database
    const result = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${session.userId}`,
          SK: 'METADATA',
        },
      })
    );

    if (!result.Item) {
      return unauthorizedResponse('User not found');
    }

    const user = result.Item;

    // Check if user is active
    if (!user.isActive) {
      return unauthorizedResponse('Account is inactive');
    }

    // Generate new access token
    const newAccessToken = generateAccessToken({
      userId: user.userId,
      email: user.email,
      username: user.username,
      roles: user.roles,
    });

    // Rotate refresh token for enhanced security
    const newRefreshToken = await rotateRefreshToken(
      session.userId,
      session.sessionId,
      user.email
    );

    const response: TokenResponse = {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
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
    console.error('Refresh token error:', error);
    return errorResponse(error.message || 'Token refresh failed');
  }
};
