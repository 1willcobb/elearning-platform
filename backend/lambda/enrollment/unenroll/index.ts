import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

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

    const userId = 'user123'; // TODO: Get from JWT

    await docClient.send(
      new DeleteCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Key: { PK: `USER#${userId}`, SK: `ENROLLMENT#${courseId}` },
      })
    );

    await docClient.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Key: { PK: `COURSE#${courseId}`, SK: 'METADATA' },
        UpdateExpression: 'SET totalStudents = totalStudents - :dec',
        ExpressionAttributeValues: { ':dec': 1 },
      })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Unenrolled successfully' }),
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
