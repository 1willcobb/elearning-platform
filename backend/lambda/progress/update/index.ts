import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

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
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const body = JSON.parse(event.body);
    const { courseId, lessonId, watchTime, completed } = body;
    const userId = 'user123'; // TODO: Get from JWT
    const now = new Date().toISOString();

    const progressData = {
      PK: `USER#${userId}`,
      SK: `PROGRESS#${courseId}#lesson${lessonId}`,
      EntityType: 'LessonProgress',
      userId,
      courseId,
      lessonId,
      status: completed ? 'COMPLETED' : 'IN_PROGRESS',
      watchTime,
      completedAt: completed ? now : null,
      lastAccessedAt: now,
      GSI1PK: `USER#${userId}#COURSE#${courseId}`,
      GSI1SK: `PROGRESS#${lessonId}`,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Item: progressData,
      })
    );

    // Update enrollment progress if lesson completed
    if (completed) {
      const enrollment = await docClient.send(
        new GetCommand({
          TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
          Key: { PK: `USER#${userId}`, SK: `ENROLLMENT#${courseId}` },
        })
      );

      if (enrollment.Item) {
        const completedLessons = (enrollment.Item.progress?.completedLessons || 0) + 1;
        const totalLessons = enrollment.Item.progress?.totalLessons || 1;
        const completionPercentage = Math.round((completedLessons / totalLessons) * 100);

        await docClient.send(
          new UpdateCommand({
            TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
            Key: { PK: `USER#${userId}`, SK: `ENROLLMENT#${courseId}` },
            UpdateExpression: 'SET progress.completedLessons = :completed, progress.completionPercentage = :percentage, lastAccessedAt = :now',
            ExpressionAttributeValues: {
              ':completed': completedLessons,
              ':percentage': completionPercentage,
              ':now': now,
            },
          })
        );
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ message: 'Progress updated', progress: progressData }),
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
