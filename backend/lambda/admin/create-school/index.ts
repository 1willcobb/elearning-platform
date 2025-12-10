import { APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { successResponse, errorResponse, validationErrorResponse, notFoundResponse } from '../../../shared/utils/response';
import { requireSuperAdmin, AuthenticatedEvent } from '../../../shared/middleware/auth';
import { UserRole } from '../../../shared/types/auth';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const createSchoolSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(500).required(),
  adminId: Joi.string().required(),
  logo: Joi.string().uri().optional(),
  website: Joi.string().uri().optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE').default('ACTIVE'),
});

const handlerLogic = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');

    // Validate request
    const { error, value } = createSchoolSchema.validate(body);
    if (error) {
      return validationErrorResponse(error.details);
    }

    const { name, description, adminId, logo, website, status } = value;

    // Verify admin user exists
    const adminResult = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${adminId}`,
          SK: 'METADATA',
        },
      })
    );

    if (!adminResult.Item) {
      return notFoundResponse('Admin user not found');
    }

    const admin = adminResult.Item;
    const schoolId = uuidv4();
    const now = new Date().toISOString();

    // Create school
    const schoolItem = {
      PK: `SCHOOL#${schoolId}`,
      SK: 'METADATA',
      EntityType: 'School',
      schoolId,
      name,
      description,
      logo: logo || null,
      website: website || null,
      adminId,
      adminName: `${admin.firstName} ${admin.lastName}`,
      status,
      courseIds: [],
      totalCourses: 0,
      totalStudents: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: event.user!.userId,
      GSI1PK: `SCHOOLS`,
      GSI1SK: `SCHOOL#${schoolId}`,
      GSI2PK: `ADMIN#${adminId}`,
      GSI2SK: `SCHOOL#${schoolId}`,
    };

    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: schoolItem,
      })
    );

    // Update admin user to add ADMIN role if they don't have it
    const currentRoles = admin.roles || [UserRole.USER];
    if (!currentRoles.includes(UserRole.ADMIN)) {
      currentRoles.push(UserRole.ADMIN);

      await docClient.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            PK: `USER#${adminId}`,
            SK: 'METADATA',
          },
          UpdateExpression: 'SET roles = :roles, updatedAt = :updatedAt',
          ExpressionAttributeValues: {
            ':roles': currentRoles,
            ':updatedAt': now,
          },
        })
      );
    }

    return successResponse({
      schoolId,
      name,
      description,
      logo,
      website,
      adminId,
      adminName: `${admin.firstName} ${admin.lastName}`,
      status,
      courseIds: [],
      totalCourses: 0,
      totalStudents: 0,
      createdAt: now,
      message: 'School created successfully by super admin',
    }, 201);
  } catch (error: any) {
    console.error('Admin create school error:', error);
    return errorResponse(error.message || 'Failed to create school');
  }
};

export const handler = requireSuperAdmin(handlerLogic);
