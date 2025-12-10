import { APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { successResponse, errorResponse, validationErrorResponse } from '../../../shared/utils/response';
import { requireUser, AuthenticatedEvent } from '../../../shared/middleware/auth';
import { CreateSchoolRequest } from '../../../shared/types/school';
import { UserRole } from '../../../shared/types/auth';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const createSchoolSchema = Joi.object({
  name: Joi.string().min(3).max(100).required(),
  description: Joi.string().min(10).max(500).required(),
  logo: Joi.string().uri().optional(),
  website: Joi.string().uri().optional(),
});

const handlerLogic = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body: CreateSchoolRequest = JSON.parse(event.body || '{}');

    // Validate request
    const { error } = createSchoolSchema.validate(body);
    if (error) {
      return validationErrorResponse(error.details);
    }

    const userId = event.user!.userId;
    const { name, description, logo, website } = body;

    // Check if user already has a school
    const existingSchool = await docClient.send(
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

    if (existingSchool.Items && existingSchool.Items.length > 0) {
      return errorResponse('You already have a school. Each user can only create one school.', 409);
    }

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
      adminId: userId,
      adminName: `${event.user!.firstName} ${event.user!.lastName}`,
      status: 'ACTIVE',
      courseIds: [],
      totalCourses: 0,
      totalStudents: 0,
      createdAt: now,
      updatedAt: now,
      GSI1PK: `SCHOOLS`,
      GSI1SK: `SCHOOL#${schoolId}`,
      GSI2PK: `ADMIN#${userId}`,
      GSI2SK: `SCHOOL#${schoolId}`,
    };

    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: schoolItem,
      })
    );

    // Update user to add ADMIN role
    const currentRoles = event.user!.roles || [UserRole.USER];
    if (!currentRoles.includes(UserRole.ADMIN)) {
      currentRoles.push(UserRole.ADMIN);

      await docClient.send(
        new UpdateCommand({
          TableName: tableName,
          Key: {
            PK: `USER#${userId}`,
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
      adminId: userId,
      status: 'ACTIVE',
      courseIds: [],
      totalCourses: 0,
      totalStudents: 0,
      createdAt: now,
      updatedAt: now,
      message: 'School created successfully. You are now an admin!',
    }, 201);
  } catch (error: any) {
    console.error('Create school error:', error);
    return errorResponse(error.message || 'Failed to create school');
  }
};

export const handler = requireUser(handlerLogic);
