import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { v4 as uuidv4 } from 'uuid';

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  ...(process.env.STAGE === 'local' && {
    endpoint: 'http://localhost:8000',
    credentials: {
      accessKeyId: 'local',
      secretAccessKey: 'local',
    },
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
    const courseId = uuidv4();
    const now = new Date().toISOString();

    // TODO: Get instructorId from JWT token
    const instructorId = 'USER#instructor789'; // Mock for now

    const courseData = {
      PK: `COURSE#${courseId}`,
      SK: 'METADATA',
      EntityType: 'CourseMetadata',
      courseId,
      title: body.title,
      slug: body.title.toLowerCase().replace(/\s+/g, '-'),
      description: body.description || '',
      longDescription: body.longDescription || '',
      instructorId,
      instructorName: body.instructorName || 'Instructor',
      
      category: body.category || 'Uncategorized',
      subcategory: body.subcategory || '',
      tags: body.tags || [],
      level: body.level || 'BEGINNER',
      language: body.language || 'English',
      
      price: body.price || 0,
      currency: body.currency || 'USD',
      
      status: 'DRAFT',
      isPublished: false,
      
      totalDuration: 0,
      totalLessons: 0,
      totalSections: 0,
      totalStudents: 0,
      totalReviews: 0,
      averageRating: 0,
      
      createdAt: now,
      updatedAt: now,
      
      // GSI indexes
      GSI1PK: `CATEGORY#${body.category || 'Uncategorized'}`,
      GSI1SK: `RATING#0#COURSE#${courseId}`,
      GSI2PK: instructorId,
      GSI2SK: `COURSE#${courseId}`,
      GSI3PK: 'STATUS#DRAFT',
      GSI3SK: `DATE#${now}#COURSE#${courseId}`,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Item: courseData,
      })
    );

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Course created successfully',
        course: courseData,
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