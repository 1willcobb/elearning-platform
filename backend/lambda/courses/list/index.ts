import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

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
    console.log('Listing courses...');
    console.log('Table:', process.env.TABLE_NAME || 'ELearningPlatform-local');

    // Scan with EntityType filter instead of SK
    const result = await docClient.send(
      new ScanCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        FilterExpression: 'EntityType = :type OR (begins_with(PK, :prefix) AND SK = :sk)',
        ExpressionAttributeValues: {
          ':type': 'CourseMetadata',
          ':prefix': 'COURSE#',
          ':sk': 'METADATA',
        },
      })
    );

    console.log('Scan result count:', result.Count);
    console.log('Items found:', JSON.stringify(result.Items, null, 2));

    const courses = (result.Items || [])
      .filter(item => item.courseId) // Only items with courseId
      .map((item) => ({
        courseId: item.courseId,
        title: item.title,
        description: item.description,
        thumbnail: item.thumbnail || 'https://via.placeholder.com/400x200',
        instructorName: item.instructorName,
        price: item.price,
        discountPrice: item.discountPrice,
        currency: item.currency || 'USD',
        category: item.category,
        level: item.level,
        totalStudents: item.totalStudents || 0,
        averageRating: item.averageRating || 0,
        totalDuration: item.totalDuration || 0,
        totalLessons: item.totalLessons || 0,
      }));

    console.log('Formatted courses:', JSON.stringify(courses, null, 2));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        courses,
        pagination: {
          total: courses.length,
          limit: 20,
          hasMore: false,
        },
      }),
    };
  } catch (error) {
    console.error('Error listing courses:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
