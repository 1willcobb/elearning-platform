import { APIGatewayProxyResult } from 'aws-lambda';
import { DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { successResponse, errorResponse, forbiddenResponse, notFoundResponse } from '../../../shared/utils/response';
import { requireAdmin, AuthenticatedEvent } from '../../../shared/middleware/auth';
import { UserRole } from '../../../shared/types/auth';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const handlerLogic = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const schoolId = event.pathParameters?.schoolId;
    if (!schoolId) {
      return errorResponse('School ID is required', 400);
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
      return forbiddenResponse('You do not have permission to delete this school');
    }

    // Delete school
    await docClient.send(
      new DeleteCommand({
        TableName: tableName,
        Key: {
          PK: `SCHOOL#${schoolId}`,
          SK: 'METADATA',
        },
      })
    );

    return successResponse({ message: 'School deleted successfully' });
  } catch (error: any) {
    console.error('Delete school error:', error);
    return errorResponse(error.message || 'Failed to delete school');
  }
};

export const handler = requireAdmin(handlerLogic);
