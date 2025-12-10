import { APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { successResponse, errorResponse, notFoundResponse } from '../../../shared/utils/response';
import { requireUser, AuthenticatedEvent } from '../../../shared/middleware/auth';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const handlerLogic = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.user!.userId;

    // Get user's school
    const result = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: 'GSI2',
        KeyConditionExpression: 'GSI2PK = :adminId',
        ExpressionAttributeValues: {
          ':adminId': `ADMIN#${userId}`,
        },
        Limit: 1,
      })
    );

    if (!result.Items || result.Items.length === 0) {
      return notFoundResponse('You do not have a school yet. Create one to become an admin!');
    }

    const school = result.Items[0];

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
    console.error('Get my school error:', error);
    return errorResponse(error.message || 'Failed to get school');
  }
};

export const handler = requireUser(handlerLogic);
