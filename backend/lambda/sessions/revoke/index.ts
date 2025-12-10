import { APIGatewayProxyResult } from 'aws-lambda';
import { revokeSession } from '../../../shared/utils/session';
import { successResponse, errorResponse } from '../../../shared/utils/response';
import { requireUser, AuthenticatedEvent } from '../../../shared/middleware/auth';

const handlerLogic = async (event: AuthenticatedEvent): Promise<APIGatewayProxyResult> => {
  try {
    const sessionId = event.pathParameters?.sessionId;

    if (!sessionId) {
      return errorResponse('Session ID is required', 400);
    }

    const userId = event.user!.userId;

    // Revoke the session
    await revokeSession(userId, sessionId);

    return successResponse({
      message: 'Session revoked successfully',
      sessionId,
    });
  } catch (error: any) {
    console.error('Revoke session error:', error);
    return errorResponse(error.message || 'Failed to revoke session');
  }
};

export const handler = requireUser(handlerLogic);
