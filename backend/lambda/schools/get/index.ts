import { APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { successResponse, errorResponse, notFoundResponse } from '../../../shared/utils/response';
import { requireUser, AuthenticatedEvent } from '../../../shared/middleware/auth';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const handlerLogic = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const schoolId = event.pathParameters?.schoolId;
    if (!schoolId) {
      return errorResponse('School ID is required', 400);
    }

    const result = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `SCHOOL#${schoolId}`,
          SK: 'METADATA',
        },
      })
    );

    if (!result.Item) {
      return notFoundResponse('School not found');
    }

    const school = result.Item;

    return successResponse({
      schoolId: school.schoolId,
      name: school.name,
      description: school.description,
      logo: school.logo,
      website: school.website,
      adminId: school.adminId,
      adminName: school.adminName,
      status: school.status,
      courseIds: school.courseIds || [],
      totalCourses: school.totalCourses || 0,
      totalStudents: school.totalStudents || 0,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
    });
  } catch (error: any) {
    console.error('Get school error:', error);
    return errorResponse(error.message || 'Failed to get school');
  }
};

export const handler = requireUser(handlerLogic);
