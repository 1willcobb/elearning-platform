import { APIGatewayProxyResult } from 'aws-lambda';
import { getUserSessions, cleanupExpiredSessions } from '../../../shared/utils/session';
import { successResponse, errorResponse } from '../../../shared/utils/response';
import { requireUser, AuthenticatedEvent } from '../../../shared/middleware/auth';
import { SessionInfo } from '../../../shared/types/session';

const handlerLogic = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.user!.userId;

    // Cleanup expired sessions first
    await cleanupExpiredSessions(userId);

    // Get all active sessions
    const sessions = await getUserSessions(userId);

    // Get current session ID from query params (if provided by frontend)
    const currentSessionId = event.queryStringParameters?.currentSessionId;

    // Map sessions to SessionInfo format
    const sessionInfos: SessionInfo[] = sessions.map((session) => ({
      sessionId: session.sessionId,
      deviceInfo: session.deviceInfo,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      expiresAt: session.expiresAt,
      isActive: session.isActive,
      isCurrent: currentSessionId ? session.sessionId === currentSessionId : false,
    }));

    // Sort by last used (most recent first)
    sessionInfos.sort((a, b) =>
      new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime()
    );

    return successResponse({
      sessions: sessionInfos,
      count: sessionInfos.length,
    });
  } catch (error: any) {
    console.error('List sessions error:', error);
    return errorResponse(error.message || 'Failed to list sessions');
  }
};

export const handler = requireUser(handlerLogic);
