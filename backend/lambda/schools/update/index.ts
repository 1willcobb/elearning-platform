import { APIGatewayProxyResult } from 'aws-lambda';
import { UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import Joi from 'joi';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { successResponse, errorResponse, validationErrorResponse, forbiddenResponse, notFoundResponse } from '../../../shared/utils/response';
import { requireAdmin, AuthenticatedEvent } from '../../../shared/middleware/auth';
import { UpdateSchoolRequest } from '../../../shared/types/school';
import { UserRole } from '../../../shared/types/auth';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const updateSchoolSchema = Joi.object({
  name: Joi.string().min(3).max(100).optional(),
  description: Joi.string().min(10).max(500).optional(),
  logo: Joi.string().uri().optional(),
  website: Joi.string().uri().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').optional(),
});

const handlerLogic = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const schoolId = event.pathParameters?.schoolId;
    if (!schoolId) {
      return errorResponse('School ID is required', 400);
    }

    const body: UpdateSchoolRequest = JSON.parse(event.body || '{}');

    // Validate request
    const { error } = updateSchoolSchema.validate(body);
    if (error) {
      return validationErrorResponse(error.details);
    }

    // Get school
    const schoolResult = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `SCHOOL#${schoolId}`,
          SK: 'METADATA',
        },
      })
    );

    if (!schoolResult.Item) {
      return notFoundResponse('School not found');
    }

    const school = schoolResult.Item;

    // Check if user is the admin of this school or super admin
    const isSuperAdmin = event.user!.roles.includes(UserRole.SUPER_ADMIN);
    const isSchoolAdmin = school.adminId === event.user!.userId;

    if (!isSuperAdmin && !isSchoolAdmin) {
      return forbiddenResponse('You do not have permission to update this school');
    }

    // Build update expression
    const updates: string[] = [];
    const attributeNames: any = {};
    const attributeValues: any = {};

    if (body.name !== undefined) {
      updates.push('#name = :name');
      attributeNames['#name'] = 'name';
      attributeValues[':name'] = body.name;
    }

    if (body.description !== undefined) {
      updates.push('description = :description');
      attributeValues[':description'] = body.description;
    }

    if (body.logo !== undefined) {
      updates.push('logo = :logo');
      attributeValues[':logo'] = body.logo;
    }

    if (body.website !== undefined) {
      updates.push('website = :website');
      attributeValues[':website'] = body.website;
    }

    if (body.status !== undefined) {
      updates.push('#status = :status');
      attributeNames['#status'] = 'status';
      attributeValues[':status'] = body.status;
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    updates.push('updatedAt = :updatedAt');
    attributeValues[':updatedAt'] = new Date().toISOString();

    const updateExpression = `SET ${updates.join(', ')}`;

    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `SCHOOL#${schoolId}`,
          SK: 'METADATA',
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: Object.keys(attributeNames).length > 0 ? attributeNames : undefined,
        ExpressionAttributeValues: attributeValues,
      })
    );

    return successResponse({ message: 'School updated successfully' });
  } catch (error: any) {
    console.error('Update school error:', error);
    return errorResponse(error.message || 'Failed to update school');
  }
};

export const handler = requireAdmin(handlerLogic);
