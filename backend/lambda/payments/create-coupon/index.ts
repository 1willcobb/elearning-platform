
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

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
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const body = JSON.parse(event.body);
    const now = new Date().toISOString();
    const couponCode = body.couponCode.toUpperCase();

    // Check if coupon already exists
    const existing = await docClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Key: { PK: `COUPON#${couponCode}`, SK: 'METADATA' },
      })
    );

    if (existing.Item) {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Coupon code already exists' }),
      };
    }

    const couponData = {
      PK: `COUPON#${couponCode}`,
      SK: 'METADATA',
      EntityType: 'Coupon',
      couponCode,
      
      type: body.type, // PERCENTAGE | FIXED_AMOUNT
      discountValue: body.discountValue,
      
      applicableTo: body.applicableTo || 'ALL', // ALL | SPECIFIC_COURSES | CATEGORY
      specificCourses: body.specificCourses || null,
      category: body.category || null,
      
      maxUses: body.maxUses || 1000,
      usedCount: 0,
      
      minPurchaseAmount: body.minPurchaseAmount || 0,
      maxDiscountAmount: body.maxDiscountAmount || null,
      
      validFrom: body.validFrom,
      validUntil: body.validUntil,
      
      isActive: true,
      
      createdBy: 'ADMIN#admin123', // TODO: Get from JWT
      createdAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Item: couponData,
      })
    );

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'Coupon created successfully',
        coupon: couponData,
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