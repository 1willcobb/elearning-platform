import { APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { successResponse, errorResponse } from '../../../shared/utils/response';
import { requireSuperAdmin, AuthenticatedEvent } from '../../../shared/middleware/auth';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const handlerLogic = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const limit = parseInt(event.queryStringParameters?.limit || '100');
    const lastKey = event.queryStringParameters?.lastKey;
    const status = event.queryStringParameters?.status;

    const queryParams: any = {
      TableName: tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :schoolsKey',
      ExpressionAttributeValues: {
        ':schoolsKey': 'SCHOOLS',
      },
      Limit: limit,
    };

    if (status) {
      queryParams.FilterExpression = '#status = :status';
      queryParams.ExpressionAttributeNames = {
        '#status': 'status',
      };
      queryParams.ExpressionAttributeValues[':status'] = status;
    }

    if (lastKey) {
      queryParams.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastKey));
    }

    const result = await docClient.send(new QueryCommand(queryParams));

    const schools = (result.Items || []).map((school) => ({
      schoolId: school.schoolId,
      name: school.name,
      description: school.description,
      logo: school.logo,
      website: school.website,
      adminId: school.adminId,
      adminName: school.adminName,
      status: school.status,
      totalCourses: school.totalCourses || 0,
      totalStudents: school.totalStudents || 0,
      createdAt: school.createdAt,
      updatedAt: school.updatedAt,
    }));

    return successResponse({
      schools,
      count: schools.length,
      lastKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
    });
  } catch (error: any) {
    console.error('List all schools error:', error);
    return errorResponse(error.message || 'Failed to list schools');
  }
};

export const handler = requireSuperAdmin(handlerLogic);
