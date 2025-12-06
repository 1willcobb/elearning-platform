import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb';

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
    const couponCode = event.pathParameters?.couponCode?.toUpperCase();
    const { courseId, amount } = event.queryStringParameters || {};

    if (!couponCode) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Coupon code is required' }),
      };
    }

    const coupon = await docClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Key: { PK: `COUPON#${couponCode}`, SK: 'METADATA' },
      })
    );

    if (!coupon.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ valid: false, error: 'Coupon not found' }),
      };
    }

    const now = new Date();
    const validFrom = new Date(coupon.Item.validFrom);
    const validUntil = new Date(coupon.Item.validUntil);

    // Validation checks
    const validations = {
      isActive: coupon.Item.isActive,
      isNotExpired: now >= validFrom && now <= validUntil,
      hasUsesRemaining: coupon.Item.usedCount < coupon.Item.maxUses,
      meetsMinimum: !amount || parseFloat(amount) >= coupon.Item.minPurchaseAmount,
      applicableToCourse: true, // TODO: Check if applicable to specific course
    };

    const isValid = Object.values(validations).every(v => v === true);

    let discountAmount = 0;
    if (isValid && amount) {
      const purchaseAmount = parseFloat(amount);
      if (coupon.Item.type === 'PERCENTAGE') {
        discountAmount = (purchaseAmount * coupon.Item.discountValue) / 100;
      } else {
        discountAmount = coupon.Item.discountValue;
      }

      if (coupon.Item.maxDiscountAmount) {
        discountAmount = Math.min(discountAmount, coupon.Item.maxDiscountAmount);
      }
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        valid: isValid,
        coupon: isValid ? {
          code: coupon.Item.couponCode,
          type: coupon.Item.type,
          discountValue: coupon.Item.discountValue,
          discountAmount,
          validUntil: coupon.Item.validUntil,
        } : null,
        validations,
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