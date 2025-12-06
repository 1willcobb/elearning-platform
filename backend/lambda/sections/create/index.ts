import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

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

    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

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

    const body = JSON.parse(event.body);
    const now = new Date().toISOString();

    const existingSections = await docClient.send(
      new QueryCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `COURSE#${courseId}`,
          ':sk': 'SECTION#',
        },
      })
    );

    const sectionCount = existingSections.Items?.length || 0;
    const order = body.order || (sectionCount + 1);
    const sectionId = String(order).padStart(3, '0');

    const sectionData = {
      PK: `COURSE#${courseId}`,
      SK: `SECTION#${sectionId}`,
      EntityType: 'CourseSection',
      sectionId,
      courseId,
      title: body.title,
      description: body.description || '',
      order,
      duration: 0,
      lessonCount: 0,
      isPublished: body.isPublished || false,
      isFree: body.isFree || false,
      createdAt: now,
      updatedAt: now,
      GSI1PK: `COURSE#${courseId}#SECTIONS`,
      GSI1SK: `ORDER#${sectionId}`,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Item: sectionData,
      })
    );

    await docClient.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Key: { PK: `COURSE#${courseId}`, SK: 'METADATA' },
        UpdateExpression: 'SET totalSections = totalSections + :inc, updatedAt = :now',
        ExpressionAttributeValues: { ':inc': 1, ':now': now },
      })
    );

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Section created successfully', section: sectionData }),
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
