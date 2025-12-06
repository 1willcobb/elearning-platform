import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

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
    const userId = event.pathParameters?.userId || 'user123'; // TODO: Get from JWT
    const { limit = '20' } = event.queryStringParameters || {};

    const result = await docClient.send(
      new QueryCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :key',
        ExpressionAttributeValues: {
          ':key': `USER#${userId}#PAYMENTS`,
        },
        Limit: parseInt(limit),
        ScanIndexForward: false, // Most recent first
      })
    );

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        payments: result.Items || [],
        total: result.Items?.length || 0,
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