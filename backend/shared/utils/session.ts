import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBClient, getTableName } from './db';
import { generateSessionId } from './tokens';
import { generateRefreshToken } from './jwt';
import { Session } from '../types/session';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const REFRESH_TOKEN_EXPIRY_DAYS = 7;

interface CreateSessionParams {
  userId: string;
  email: string;
  userAgent?: string;
  ip?: string;
}

export const createSession = async (params: CreateSessionParams): Promise<{ sessionId: string; refreshToken: string }> => {
  const sessionId = generateSessionId();
  const refreshToken = generateRefreshToken({ userId: params.userId, email: params.email });

  const now = new Date();
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  // Parse user agent to get platform info
  const platform = params.userAgent ? getPlatformFromUserAgent(params.userAgent) : undefined;

  const session: Session = {
    sessionId,
    userId: params.userId,
    refreshToken,
    deviceInfo: {
      userAgent: params.userAgent,
      ip: params.ip,
      platform,
    },
    createdAt: now.toISOString(),
    lastUsedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    isActive: true,
  };

  await docClient.send(
    new PutCommand({
      TableName: tableName,
      Item: {
        PK: `USER#${params.userId}`,
        SK: `SESSION#${sessionId}`,
        EntityType: 'Session',
        ...session,
        GSI1PK: `SESSION#${sessionId}`,
        GSI1SK: `USER#${params.userId}`,
      },
    })
  );

  return { sessionId, refreshToken };
};

export const updateSessionLastUsed = async (userId: string, sessionId: string): Promise<void> => {
  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: `SESSION#${sessionId}`,
      },
      UpdateExpression: 'SET lastUsedAt = :lastUsedAt',
      ExpressionAttributeValues: {
        ':lastUsedAt': new Date().toISOString(),
      },
    })
  );
};

export const revokeSession = async (userId: string, sessionId: string): Promise<void> => {
  await docClient.send(
    new DeleteCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: `SESSION#${sessionId}`,
      },
    })
  );
};

export const revokeAllUserSessions = async (userId: string): Promise<void> => {
  const sessionsResult = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :userId AND begins_with(SK, :sessionPrefix)',
      ExpressionAttributeValues: {
        ':userId': `USER#${userId}`,
        ':sessionPrefix': 'SESSION#',
      },
    })
  );

  if (sessionsResult.Items && sessionsResult.Items.length > 0) {
    // Delete sessions in batches (DynamoDB limit is 25 items per batch)
    const deletePromises = sessionsResult.Items.map((item) =>
      docClient.send(
        new DeleteCommand({
          TableName: tableName,
          Key: {
            PK: item.PK,
            SK: item.SK,
          },
        })
      )
    );

    await Promise.all(deletePromises);
  }
};

export const getUserSessions = async (userId: string): Promise<Session[]> => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: 'PK = :userId AND begins_with(SK, :sessionPrefix)',
      ExpressionAttributeValues: {
        ':userId': `USER#${userId}`,
        ':sessionPrefix': 'SESSION#',
      },
    })
  );

  return (result.Items || []) as Session[];
};

export const getSessionByRefreshToken = async (refreshToken: string): Promise<Session | null> => {
  // Note: This requires a scan which is not optimal
  // In production, consider storing a hash of the refresh token as a GSI key
  const result = await docClient.send(
    new QueryCommand({
      TableName: tableName,
      IndexName: 'GSI1',
      KeyConditionExpression: 'begins_with(GSI1PK, :sessionPrefix)',
      FilterExpression: 'refreshToken = :refreshToken',
      ExpressionAttributeValues: {
        ':sessionPrefix': 'SESSION#',
        ':refreshToken': refreshToken,
      },
    })
  );

  if (!result.Items || result.Items.length === 0) {
    return null;
  }

  return result.Items[0] as Session;
};

export const rotateRefreshToken = async (
  userId: string,
  sessionId: string,
  email: string
): Promise<string> => {
  const newRefreshToken = generateRefreshToken({ userId, email });

  await docClient.send(
    new UpdateCommand({
      TableName: tableName,
      Key: {
        PK: `USER#${userId}`,
        SK: `SESSION#${sessionId}`,
      },
      UpdateExpression: 'SET refreshToken = :refreshToken, lastUsedAt = :lastUsedAt',
      ExpressionAttributeValues: {
        ':refreshToken': newRefreshToken,
        ':lastUsedAt': new Date().toISOString(),
      },
    })
  );

  return newRefreshToken;
};

export const cleanupExpiredSessions = async (userId: string): Promise<number> => {
  const sessions = await getUserSessions(userId);
  const now = new Date();

  const expiredSessions = sessions.filter((session) => {
    const expiresAt = new Date(session.expiresAt);
    return expiresAt < now;
  });

  if (expiredSessions.length > 0) {
    const deletePromises = expiredSessions.map((session) =>
      revokeSession(userId, session.sessionId)
    );
    await Promise.all(deletePromises);
  }

  return expiredSessions.length;
};

function getPlatformFromUserAgent(userAgent: string): string {
  const ua = userAgent.toLowerCase();

  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone') || ua.includes('ipad')) {
    if (ua.includes('android')) return 'Android';
    if (ua.includes('iphone')) return 'iPhone';
    if (ua.includes('ipad')) return 'iPad';
    return 'Mobile';
  }

  if (ua.includes('windows')) return 'Windows';
  if (ua.includes('mac')) return 'macOS';
  if (ua.includes('linux')) return 'Linux';

  return 'Unknown';
}
