import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, DeleteCommand, GetCommand, QueryCommand, UpdateCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

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
    const { courseId, sectionId } = event.pathParameters || {};
    if (!courseId || !sectionId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'courseId and sectionId are required' }),
      };
    }

    const section = await docClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Key: { PK: `COURSE#${courseId}`, SK: `SECTION#${sectionId}` },
      })
    );

    if (!section.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Section not found' }),
      };
    }

    const lessons = await docClient.send(
      new QueryCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :key',
        ExpressionAttributeValues: { ':key': `COURSE#${courseId}#SECTION#${sectionId}` },
      })
    );

    const items = lessons.Items || [];
    for (let i = 0; i < items.length; i += 25) {
      const batch = items.slice(i, i + 25);
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [process.env.TABLE_NAME || 'ELearningPlatform-local']: batch.map((item) => ({
              DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
            })),
          },
        })
      );
    }

    await docClient.send(
      new DeleteCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Key: { PK: `COURSE#${courseId}`, SK: `SECTION#${sectionId}` },
      })
    );

    await docClient.send(
      new UpdateCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Key: { PK: `COURSE#${courseId}`, SK: 'METADATA' },
        UpdateExpression: 'SET totalSections = totalSections - :dec, totalLessons = totalLessons - :lessonDec',
        ExpressionAttributeValues: { ':dec': 1, ':lessonDec': items.length },
      })
    );

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Section and all lessons deleted successfully', deletedLessons: items.length }),
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
