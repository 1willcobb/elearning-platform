// =============================================================================
// lambda/users/create-profile/index.ts
// =============================================================================

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

    // TODO: Get userId from Cognito JWT token
    const userId = body.userId || `user${Date.now()}`;

    // Check if profile already exists
    const existing = await docClient.send(
      new GetCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
      })
    );

    if (existing.Item) {
      return {
        statusCode: 409,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Profile already exists' }),
      };
    }

    // Create user profile
    const profileData = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      EntityType: 'UserProfile',
      userId,
      email: body.email,
      name: body.name,
      avatar: body.avatar || null,
      role: body.role || 'STUDENT',
      bio: body.bio || '',
      website: body.website || '',
      socialLinks: body.socialLinks || {},
      createdAt: now,
      updatedAt: now,
      isActive: true,
      isEmailVerified: body.isEmailVerified || false,
      
      GSI1PK: `EMAIL#${body.email}`,
      GSI1SK: `USER#${userId}`,
      GSI2PK: `ROLE#${body.role || 'STUDENT'}`,
      GSI2SK: `USER#${userId}`,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Item: profileData,
      })
    );

    // Create default settings
    const settingsData = {
      PK: `USER#${userId}`,
      SK: 'SETTINGS',
      EntityType: 'UserSettings',
      notifications: {
        email: true,
        push: true,
        courseUpdates: true,
        newCourses: false,
      },
      privacy: {
        showProfile: true,
        showProgress: false,
      },
      preferences: {
        language: 'en',
        theme: 'light',
        videoQuality: 'auto',
        playbackSpeed: 1.0,
      },
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: process.env.TABLE_NAME || 'ELearningPlatform-local',
        Item: settingsData,
      })
    );

    return {
      statusCode: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: 'User profile created successfully',
        profile: profileData,
        settings: settingsData,
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
