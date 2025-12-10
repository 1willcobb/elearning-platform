import { APIGatewayProxyResult } from 'aws-lambda';
import { DeleteCommand, GetCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { successResponse, errorResponse, notFoundResponse } from '../../../shared/utils/response';
import { requireSuperAdmin, AuthenticatedEvent } from '../../../shared/middleware/auth';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const handlerLogic = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.pathParameters?.userId;
    if (!userId) {
      return errorResponse('User ID is required', 400);
    }

    // Get user
    const userResult = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: 'METADATA',
        },
      })
    );

    if (!userResult.Item) {
      return notFoundResponse('User not found');
    }

    const user = userResult.Item;

    // Delete username mapping
    await docClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {
          PK: `USERNAME#${user.username}`,
          SK: 'METADATA',
        },
      })
    );

    // Delete email mapping
    await docClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {
          PK: `EMAIL#${user.email}`,
          SK: 'METADATA',
        },
      })
    );

    // Query all user-related data (enrollments, progress, settings, etc.)
    const userDataResult = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :userId',
        ExpressionAttributeValues: {
          ':userId': `USER#${userId}`,
        },
      })
    );

    // Delete all user data in batches
    if (userDataResult.Items && userDataResult.Items.length > 0) {
      const chunks = [];
      for (let i = 0; i < userDataResult.Items.length; i += 25) {
        chunks.push(userDataResult.Items.slice(i, i + 25));
      }

      for (const chunk of chunks) {
        await docClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [tableName]: chunk.map((item) => ({
                DeleteRequest: {
                  Key: {
                    PK: item.PK,
                    SK: item.SK,
                  },
                },
              })),
            },
          })
        );
      }
    }

    return successResponse({
      userId,
      message: 'User and all associated data deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return errorResponse(error.message || 'Failed to delete user');
  }
};

export const handler = requireSuperAdmin(handlerLogic);
