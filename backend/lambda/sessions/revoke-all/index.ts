import { APIGatewayProxyResult } from 'aws-lambda';
import { revokeAllUserSessions } from '../../../shared/utils/session';
import { successResponse, errorResponse } from '../../../shared/utils/response';
import { requireUser, AuthenticatedEvent } from '../../../shared/middleware/auth';

const handlerLogic = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const userId = event.user!.userId;
    const excludeCurrent = event.queryStringParameters?.excludeCurrent === 'true';
    const currentSessionId = event.queryStringParameters?.currentSessionId;

    if (excludeCurrent && currentSessionId) {
      // Revoke all sessions except the current one
      // This is handled in the frontend by getting all sessions and revoking them one by one
      // except the current one. For now, we'll revoke all.
      // TODO: Implement exclude logic in session utility
      return errorResponse('Exclude current session not yet implemented. Use /sessions/revoke for individual sessions.', 501);
    }

    // Revoke all sessions
    await revokeAllUserSessions(userId);

    return successResponse({
      message: 'All sessions revoked successfully',
    });
  } catch (error: any) {
    console.error('Revoke all sessions error:', error);
    return errorResponse(error.message || 'Failed to revoke all sessions');
  }
};

export const handler = requireUser(handlerLogic);
