import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

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

    const body = JSON.parse(event.body);
    const { sectionOrder } = body;

    if (!Array.isArray(sectionOrder)) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'sectionOrder array is required', example: { sectionOrder: [{ sectionId: '001', order: 1 }] } }),
      };
    }

    const now = new Date().toISOString();
    const updatePromises = [];

    for (const item of sectionOrder) {
      const updatePromise = docClient.send(
        new UpdateCommand({
          TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
          Key: { PK: `COURSE#${courseId}`, SK: `SECTION#${item.sectionId}` },
          UpdateExpression: 'SET #order = :order, #updatedAt = :now, #GSI1SK = :gsi1sk',
          ExpressionAttributeNames: { '#order': 'order', '#updatedAt': 'updatedAt', '#GSI1SK': 'GSI1SK' },
          ExpressionAttributeValues: {
            ':order': item.order,
            ':now': now,
            ':gsi1sk': `ORDER#${String(item.order).padStart(3, '0')}`,
          },
        })
      );
      updatePromises.push(updatePromise);
    }

    await Promise.all(updatePromises);

    const updatedSections = await docClient.send(
      new QueryCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :key',
        ExpressionAttributeValues: { ':key': `COURSE#${courseId}#SECTIONS` },
      })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        message: 'Sections reordered successfully',
        sections: updatedSections.Items?.sort((a, b) => a.order - b.order) || [],
      }),
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
