import { APIGatewayProxyResult } from 'aws-lambda';
import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import Joi from 'joi';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { successResponse, errorResponse, validationErrorResponse, notFoundResponse } from '../../../shared/utils/response';
import { requireSuperAdmin, AuthenticatedEvent } from '../../../shared/middleware/auth';
import { UserRole } from '../../../shared/types/auth';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const updateRolesSchema = Joi.object({
  userId: Joi.string().required(),
  roles: Joi.array().items(Joi.string().valid(...Object.values(UserRole))).min(1).required(),
});

const handlerLogic = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');

    // Validate request
    const { error } = updateRolesSchema.validate(body);
    if (error) {
      return validationErrorResponse(error.details);
    }

    const { userId, roles } = body;

    // Verify user exists
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

    const now = new Date().toISOString();

    // Update user roles
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: 'METADATA',
        },
        UpdateExpression: 'SET roles = :roles, updatedAt = :updatedAt, GSI2PK = :gsi2pk',
        ExpressionAttributeValues: {
          ':roles': roles,
          ':updatedAt': now,
          ':gsi2pk': `ROLE#${roles[0]}`,
        },
      })
    );

    return successResponse({
      userId,
      roles,
      updatedAt: now,
      message: 'User roles updated successfully',
    });
  } catch (error: any) {
    console.error('Update user roles error:', error);
    return errorResponse(error.message || 'Failed to update user roles');
  }
};

export const handler = requireSuperAdmin(handlerLogic);
