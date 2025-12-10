import { APIGatewayProxyResult } from 'aws-lambda';
import { PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import Joi from 'joi';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { successResponse, errorResponse, validationErrorResponse, notFoundResponse } from '../../../shared/utils/response';
import { requireSuperAdmin, AuthenticatedEvent } from '../../../shared/middleware/auth';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const enrollSchema = Joi.object({
  userId: Joi.string().required(),
  courseId: Joi.string().required(),
  amountPaid: Joi.number().min(0).default(0),
  currency: Joi.string().default('USD'),
});

const handlerLogic = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body = JSON.parse(event.body || '{}');

    // Validate request
    const { error, value } = enrollSchema.validate(body);
    if (error) {
      return validationErrorResponse(error.details);
    }

    const { userId, courseId, amountPaid, currency } = value;

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

    // Verify course exists
    const courseResult = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `COURSE#${courseId}`,
          SK: 'METADATA',
        },
      })
    );

    if (!courseResult.Item) {
      return notFoundResponse('Course not found');
    }

    const course = courseResult.Item;

    // Check if already enrolled
    const existingEnrollment = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${userId}`,
          SK: `ENROLLMENT#${courseId}`,
        },
      })
    );

    if (existingEnrollment.Item) {
      return errorResponse('User is already enrolled in this course', 409);
    }

    const enrollmentId = uuidv4();
    const now = new Date().toISOString();

    // Create enrollment
    const enrollmentItem = {
      PK: `USER#${userId}`,
      SK: `ENROLLMENT#${courseId}`,
      EntityType: 'Enrollment',
      enrollmentId,
      userId,
      courseId,
      courseTitle: course.title,
      courseThumbnail: course.thumbnail || null,
      instructorName: course.instructorName,
      enrolledAt: now,
      lastAccessedAt: now,
      status: 'ACTIVE',
      progress: {
        completedLessons: 0,
        totalLessons: course.totalLessons || 0,
        completionPercentage: 0,
      },
      amountPaid,
      currency,
      enrolledBy: event.user!.userId,
      GSI1PK: `USER#${userId}#ENROLLMENTS`,
      GSI1SK: `STATUS#ACTIVE#DATE#${now}`,
      GSI2PK: `COURSE#${courseId}#ENROLLMENTS`,
      GSI2SK: `USER#${userId}`,
    };

    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: enrollmentItem,
      })
    );

    // Update course total students count
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `COURSE#${courseId}`,
          SK: 'METADATA',
        },
        UpdateExpression: 'SET totalStudents = if_not_exists(totalStudents, :zero) + :inc',
        ExpressionAttributeValues: {
          ':zero': 0,
          ':inc': 1,
        },
      })
    );

    return successResponse({
      enrollmentId,
      userId,
      courseId,
      courseTitle: course.title,
      enrolledAt: now,
      status: 'ACTIVE',
      message: 'User enrolled successfully by super admin',
    }, 201);
  } catch (error: any) {
    console.error('Admin manual enroll error:', error);
    return errorResponse(error.message || 'Failed to enroll user');
  }
};

export const handler = requireSuperAdmin(handlerLogic);
