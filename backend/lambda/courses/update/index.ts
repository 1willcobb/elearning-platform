import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

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

    // Check if course exists
    const existingCourse = await docClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Key: {
          PK: `COURSE#${courseId}`,
          SK: 'METADATA',
        },
      })
    );

    if (!existingCourse.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Course not found' }),
      };
    }

    const body = JSON.parse(event.body);
    const now = new Date().toISOString();

    // Build update expression dynamically
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    const allowedFields = [
      'title', 'description', 'longDescription', 'category', 'subcategory',
      'tags', 'level', 'language', 'price', 'currency', 'discountPrice',
      'discountEndDate', 'thumbnail', 'previewVideo', 'requirements',
      'learningOutcomes', 'targetAudience', 'status', 'isPublished'
    ];

    allowedFields.forEach((field) => {
      if (body[field] !== undefined) {
        updateExpressions.push(`#${field} = :${field}`);
        expressionAttributeNames[`#${field}`] = field;
        expressionAttributeValues[`:${field}`] = body[field];
      }
    });

    if (updateExpressions.length === 0) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'No valid fields to update' }),
      };
    }

    // Always update updatedAt
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = now;

    // Update GSI indexes if category or status changed
    if (body.category) {
      updateExpressions.push('#GSI1PK = :GSI1PK');
      expressionAttributeNames['#GSI1PK'] = 'GSI1PK';
      expressionAttributeValues[':GSI1PK'] = `CATEGORY#${body.category}`;
    }

    if (body.status) {
      updateExpressions.push('#GSI3PK = :GSI3PK');
      expressionAttributeNames['#GSI3PK'] = 'GSI3PK';
      expressionAttributeValues[':GSI3PK'] = `STATUS#${body.status}`;
    }

    const result = await docClient.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Key: {
          PK: `COURSE#${courseId}`,
          SK: 'METADATA',
        },
        UpdateExpression: `SET ${updateExpressions.join(', ')}`,
        ExpressionAttributeNames: expressionAttributeNames,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Course updated successfully',
        course: result.Attributes,
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