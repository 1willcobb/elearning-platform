import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { extractTokenFromHeader, verifyAccessToken } from '../utils/jwt';
import { unauthorizedResponse, forbiddenResponse } from '../utils/response';
import { JWTPayload, UserRole } from '../types/auth';

export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  user?: JWTPayload;
}

export const withAuth = (
  handler: (event: AuthenticatedEvent) => Promise<APIGatewayProxyResult>,
  requiredRoles?: UserRole[]
) => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
      const token = extractTokenFromHeader(event.headers.Authorization || event.headers.authorization);

      if (!token) {
        return unauthorizedResponse('No token provided');
      }

      const payload = verifyAccessToken(token);

      // Check if user has required roles
      if (requiredRoles && requiredRoles.length > 0) {
        const hasRequiredRole = requiredRoles.some(role => payload.roles.includes(role));
        if (!hasRequiredRole) {
          return forbiddenResponse('Insufficient permissions');
        }
      }

      // Attach user to event
      const authenticatedEvent: AuthenticatedEvent = {
        ...event,
        user: payload,
      };

      return await handler(authenticatedEvent);
    } catch (error: any) {
      return unauthorizedResponse(error.message || 'Authentication failed');
    }
  };
};

export const requireUser = (handler: (event: AuthenticatedEvent) => Promise<APIGatewayProxyResult>) => {
  return withAuth(handler);
};

export const requireAdmin = (handler: (event: AuthenticatedEvent) => Promise<APIGatewayProxyResult>) => {
  return withAuth(handler, [UserRole.ADMIN, UserRole.SUPER_ADMIN]);
};

export const requireSuperAdmin = (handler: (event: AuthenticatedEvent) => Promise<APIGatewayProxyResult>) => {
  return withAuth(handler, [UserRole.SUPER_ADMIN]);
};
