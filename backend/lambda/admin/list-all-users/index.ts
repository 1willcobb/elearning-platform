import { APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { successResponse, errorResponse } from '../../../shared/utils/response';
import { requireSuperAdmin, AuthenticatedEvent } from '../../../shared/middleware/auth';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const handlerLogic = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const role = event.queryStringParameters?.role;
    const limit = parseInt(event.queryStringParameters?.limit || '100');
    const lastKey = event.queryStringParameters?.lastKey;

    let queryParams: any = {
      TableName: tableName,
      Limit: limit,
    };

    if (role) {
      // Query by role using GSI2
      queryParams.IndexName = 'GSI2';
      queryParams.KeyConditionExpression = 'GSI2PK = :role';
      queryParams.ExpressionAttributeValues = {
        ':role': `ROLE#${role}`,
      };
    } else {
      // Scan all users (not optimal but works for admin dashboard)
      queryParams.FilterExpression = 'EntityType = :entityType';
      queryParams.ExpressionAttributeValues = {
        ':entityType': 'User',
      };
    }

    if (lastKey) {
      queryParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey));
    }

    const result = role
      ? await docClient.send(new QueryCommand(queryParams))
      : await docClient.send(new QueryCommand({
          ...queryParams,
          IndexName: 'GSI1',
          KeyConditionExpression: 'begins_with(GSI1PK, :prefix)',
          ExpressionAttributeValues: {
            ':prefix': 'EMAIL#',
          },
        }));

    const users = (result.Items || []).map((user) => ({
      userId: user.userId,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      isActive: user.isActive,
      isEmailVerified: user.isEmailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }));

    return successResponse({
      users,
      count: users.length,
      lastKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
    });
  } catch (error: any) {
    console.error('List all users error:', error);
    return errorResponse(error.message || 'Failed to list users');
  }
};

export const handler = requireSuperAdmin(handlerLogic);
