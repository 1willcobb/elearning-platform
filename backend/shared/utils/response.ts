import { APIGatewayProxyResult } from 'aws-lambda';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

export const successResponse = (data: any, statusCode: number = 200): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
    body: JSON.stringify(data),
  };
};

export const errorResponse = (message: string, statusCode: number = 500): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
    body: JSON.stringify({ error: message }),
  };
};

export const validationErrorResponse = (errors: any): APIGatewayProxyResult => {
  return errorResponse(`Validation failed: ${JSON.stringify(errors)}`, 400);
};

export const unauthorizedResponse = (message: string = 'Unauthorized'): APIGatewayProxyResult => {
  return errorResponse(message, 401);
};

export const forbiddenResponse = (message: string = 'Forbidden'): APIGatewayProxyResult => {
  return errorResponse(message, 403);
};

export const notFoundResponse = (message: string = 'Not found'): APIGatewayProxyResult => {
  return errorResponse(message, 404);
};
