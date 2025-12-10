import { APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { successResponse, errorResponse } from '../../../shared/utils/response';
import { requireUser, AuthenticatedEvent } from '../../../shared/middleware/auth';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const handlerLogic = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    // List all active schools using GSI1
    const result = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :schoolsKey',
        FilterExpression: '#status = :active',
        ExpressionAttributeNames: {
          '#status': 'status',
        },
        ExpressionAttributeValues: {
          ':schoolsKey': 'SCHOOLS',
          ':active': 'ACTIVE',
        },
      })
    );

    const schools = (result.Items || []).map((school) => ({
      schoolId: school.schoolId,
      name: school.name,
      description: school.description,
      logo: school.logo,
      website: school.website,
      adminId: school.adminId,
      adminName: school.adminName,
      totalCourses: school.totalCourses || 0,
      totalStudents: school.totalStudents || 0,
      createdAt: school.createdAt,
    }));

    return successResponse({ schools, count: schools.length });
  } catch (error: any) {
    console.error('List schools error:', error);
    return errorResponse(error.message || 'Failed to list schools');
  }
};

export const handler = requireUser(handlerLogic);
