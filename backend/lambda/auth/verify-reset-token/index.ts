import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import Joi from 'joi';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { successResponse, errorResponse, validationErrorResponse } from '../../../shared/utils/response';
import { hashToken } from '../../../shared/utils/tokens';
import { VerifyResetTokenRequest } from '../../../shared/types/password-reset';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const verifySchema = Joi.object({
  token: Joi.string().required(),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Token can come from query params or body
    const token = event.queryStringParameters?.token || JSON.parse(event.body || '{}').token;

    // Validate request
    const { error } = verifySchema.validate({ token });
    if (error) {
      return validationErrorResponse(error.details);
    }

    const hashedToken = hashToken(token);

    // Get reset token from database
    const result = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `RESET_TOKEN#${hashedToken}`,
          SK: 'METADATA',
        },
      })
    );

    if (!result.Item) {
      return errorResponse('Invalid or expired reset token', 400);
    }

    const resetToken = result.Item;

    // Check if token has been used
    if (resetToken.used) {
      return errorResponse('This reset token has already been used', 400);
    }

    // Check if token has expired
    const expiresAt = new Date(resetToken.expiresAt);
    if (expiresAt < new Date()) {
      return errorResponse('This reset token has expired', 400);
    }

    return successResponse({
      valid: true,
      email: resetToken.email,
      message: 'Reset token is valid',
    });
  } catch (error: any) {
    console.error('Verify reset token error:', error);
    return errorResponse('Failed to verify reset token');
  }
};
