import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.STAGE === 'local' && {
    endpoint: 'http://localhost:8000',
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  }),
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const courseId = event.pathParameters?.courseId;
    if (!courseId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'courseId is required' }),
      };
    }

    // TODO: Get userId from JWT token
    const userId = 'user123'; // Mock for now
    const enrollmentId = uuidv4();
    const now = new Date().toISOString();

    // Get course details
    const course = await docClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Key: { PK: `COURSE#${courseId}`, SK: 'METADATA' },
      })
    );

    if (!course.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Course not found' }),
      };
    }

    const enrollmentData = {
      PK: `USER#${userId}`,
      SK: `ENROLLMENT#${courseId}`,
      EntityType: 'Enrollment',
      enrollmentId,
      userId,
      courseId,
      courseTitle: course.Item.title,
      courseThumbnail: course.Item.thumbnail,
      instructorName: course.Item.instructorName,
      enrolledAt: now,
      lastAccessedAt: now,
      status: 'ACTIVE',
      progress: {
        completedLessons: 0,
        totalLessons: course.Item.totalLessons,
        completionPercentage: 0,
      },
      amountPaid: course.Item.price,
      currency: course.Item.currency,
      GSI1PK: `USER#${userId}#ENROLLMENTS`,
      GSI1SK: `STATUS#ACTIVE#DATE#${now}`,
      GSI2PK: `COURSE#${courseId}#ENROLLMENTS`,
      GSI2SK: `USER#${userId}`,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Item: enrollmentData,
      })
    );

    // Increment course student count
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Key: { PK: `COURSE#${courseId}`, SK: 'METADATA' },
        UpdateExpression: 'SET totalStudents = totalStudents + :inc',
        ExpressionAttributeValues: { ':inc': 1 },
      })
    );

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Enrolled successfully', enrollment: enrollmentData }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' }),
    };
  }
};
