import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

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
    console.log('Event:', JSON.stringify(event, null, 2));

    const { category, limit = '20', lastKey } = event.queryStringParameters || {};

    // For now, return test data
    const response = {
      courses: [
        {
          courseId: 'course-1',
          title: 'Test Course 1',
          description: 'This is a test course',
          instructor: 'Test Instructor',
          price: 99.99,
          thumbnail: 'https://via.placeholder.com/400x300',
        },
        {
          courseId: 'course-2',
          title: 'Test Course 2',
          description: 'Another test course',
          instructor: 'Test Instructor',
          price: 49.99,
          thumbnail: 'https://via.placeholder.com/400x300',
        },
      ],
      pagination: {
        total: 2,
        limit: parseInt(limit),
        hasMore: false,
      },
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify(response),
    };
  } catch (error) {
    console.error('Error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': true,
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
