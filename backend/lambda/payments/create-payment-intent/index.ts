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
    if (!event.body) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Request body is required' }),
      };
    }

    const body = JSON.parse(event.body);
    const { courseId, couponCode } = body;
    const userId = 'user123'; // TODO: Get from JWT

    if (!courseId) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'courseId is required' }),
      };
    }

    // Get course details
    const course = await docClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Key: { PK: `COURSE#${courseId}`, SK: 'METADATA' },
      })
    );

    if (!course.Item) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Course not found' }),
      };
    }

    let finalPrice = course.Item.discountPrice || course.Item.price;
    let discountApplied = 0;
    let couponData = null;

    // Apply coupon if provided
    if (couponCode) {
      const coupon = await docClient.send(
        new GetCommand({
          TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
          Key: { PK: `COUPON#${couponCode}`, SK: 'METADATA' },
        })
      );

      if (coupon.Item && coupon.Item.isActive) {
        const now = new Date();
        const validFrom = new Date(coupon.Item.validFrom);
        const validUntil = new Date(coupon.Item.validUntil);

        if (now >= validFrom && now <= validUntil && coupon.Item.usedCount < coupon.Item.maxUses) {
          couponData = coupon.Item;
          
          if (coupon.Item.type === 'PERCENTAGE') {
            discountApplied = (finalPrice * coupon.Item.discountValue) / 100;
          } else {
            discountApplied = coupon.Item.discountValue;
          }

          if (coupon.Item.maxDiscountAmount) {
            discountApplied = Math.min(discountApplied, coupon.Item.maxDiscountAmount);
          }

          finalPrice = Math.max(0, finalPrice - discountApplied);
        }
      }
    }

    // In production, this would create a Stripe payment intent
    // For now, we'll return a mock payment intent
    const paymentIntent = {
      id: `pi_mock_${Date.now()}`,
      clientSecret: `pi_mock_${Date.now()}_secret`,
      amount: Math.round(finalPrice * 100), // Convert to cents
      currency: course.Item.currency.toLowerCase(),
      status: 'requires_payment_method',
    };

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        paymentIntent,
        course: {
          id: courseId,
          title: course.Item.title,
          originalPrice: course.Item.price,
          discountPrice: course.Item.discountPrice,
          finalPrice,
          discountApplied,
          couponApplied: couponData?.couponCode || null,
        },
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