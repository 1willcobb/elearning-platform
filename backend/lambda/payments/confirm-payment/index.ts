
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.STAGE === 'local' && {
    endpoint: 'http://localhost:8000',
    credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
  }),
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const body = JSON.parse(event.body);
    const { paymentIntentId, courseId, amount, couponCode } = body;
    const userId = 'user123'; // TODO: Get from JWT
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

    // In production, verify payment with Stripe
    // For now, assume payment is successful

    const paymentId = uuidv4();

    // Create payment record
    const paymentData = {
      PK: `USER#${userId}`,
      SK: `PAYMENT#${paymentId}`,
      EntityType: 'Payment',
      paymentId,
      userId,
      courseId,
      courseTitle: course.Item.title,
      
      amount,
      currency: course.Item.currency,
      originalPrice: course.Item.price,
      discountApplied: (course.Item.price || 0) - amount,
      couponCode: couponCode || null,
      
      paymentMethod: 'CREDIT_CARD',
      paymentProcessor: 'Stripe',
      transactionId: paymentIntentId,
      
      status: 'COMPLETED',
      
      billingDetails: body.billingDetails || {},
      
      createdAt: now,
      completedAt: now,
      
      GSI1PK: `USER#${userId}#PAYMENTS`,
      GSI1SK: `DATE#${now}`,
      GSI2PK: `COURSE#${courseId}#PAYMENTS`,
      GSI2SK: `DATE#${now}`,
      GSI3PK: 'PAYMENTS',
      GSI3SK: `DATE#${now}#PAY#${paymentId}`,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Item: paymentData,
      })
    );

    // Update coupon usage if used
    if (couponCode) {
      await docClient.send(
        new UpdateCommand({
          TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
          Key: { PK: `COUPON#${couponCode}`, SK: 'METADATA' },
          UpdateExpression: 'SET usedCount = usedCount + :inc',
          ExpressionAttributeValues: { ':inc': 1 },
        })
      );
    }

    // Create enrollment
    const enrollmentId = uuidv4();
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
      
      paymentId: `PAYMENT#${paymentId}`,
      amountPaid: amount,
      currency: course.Item.currency,
      
      certificateIssued: false,
      certificateId: null,
      expiresAt: null,
      
      GSI1PK: `USER#${userId}#ENROLLMENTS`,
      GSI1SK: `STATUS#ACTIVE#DATE#${now}`,
      GSI2PK: `COURSE#${courseId}#ENROLLMENTS`,
      GSI2SK: `USER#${userId}`,
      GSI3PK: 'ENROLLMENTS',
      GSI3SK: `DATE#${now}#ENROLL#${enrollmentId}`,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Item: enrollmentData,
      })
    );

    // Update course student count
    await docClient.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Key: { PK: `COURSE#${courseId}`, SK: 'METADATA' },
        UpdateExpression: 'SET totalStudents = totalStudents + :inc',
        ExpressionAttributeValues: { ':inc': 1 },
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Payment confirmed and enrollment created',
        payment: paymentData,
        enrollment: enrollmentData,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};