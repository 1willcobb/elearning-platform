import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { extractTokenFromHeader, verifyAccessToken } from '../../../shared/utils/jwt';
import { successResponse, unauthorizedResponse } from '../../../shared/utils/response';

const docClient = getDynamoDBClient();
const tableName = getTableName();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const token = extractTokenFromHeader(event.headers.Authorization || event.headers.authorization);

    if (!token) {
      return unauthorizedResponse('No token provided');
    }

    // Verify token
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch (err) {
      return unauthorizedResponse('Invalid or expired token');
    }

    // Get user from database to ensure they still exist and are active
    const result = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${payload.userId}`,
          SK: 'METADATA',
        },
      })
    );

    if (!result.Item) {
      return unauthorizedResponse('User not found');
    }

    const user = result.Item;

    if (!user.isActive) {
      return unauthorizedResponse('Account is inactive');
    }

    return successResponse({
      valid: true,
      user: {
        userId: user.userId,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles,
      },
    });
  } catch (error: any) {
    console.error('Token verification error:', error);
    return unauthorizedResponse('Token verification failed');
  }
};
