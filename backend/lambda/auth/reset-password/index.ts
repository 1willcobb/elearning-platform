import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, UpdateCommand, DeleteCommand, QueryCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import Joi from 'joi';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { hashPassword, validatePasswordStrength } from '../../../shared/utils/password';
import { successResponse, errorResponse, validationErrorResponse } from '../../../shared/utils/response';
import { sendPasswordResetConfirmationEmail } from '../../../shared/utils/email';
import { hashToken } from '../../../shared/utils/tokens';
import { ResetPasswordRequest } from '../../../shared/types/password-reset';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const resetSchema = Joi.object({
  token: Joi.string().required(),
  newPassword: Joi.string().required(),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body: ResetPasswordRequest = JSON.parse(event.body || '{}');

    // Validate request
    const { error } = resetSchema.validate(body);
    if (error) {
      return validationErrorResponse(error.details);
    }

    const { token, newPassword } = body;

    // Validate password strength
    const passwordValidation = validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return errorResponse(passwordValidation.message || 'Invalid password', 400);
    }

    const hashedToken = hashToken(token);

    // Get reset token from database
    const tokenResult = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `RESET_TOKEN#${hashedToken}`,
          SK: 'METADATA',
        },
      })
    );

    if (!tokenResult.Item) {
      return errorResponse('Invalid or expired reset token', 400);
    }

    const resetToken = tokenResult.Item;

    // Check if token has been used
    if (resetToken.used) {
      return errorResponse('This reset token has already been used', 400);
    }

    // Check if token has expired
    const expiresAt = new Date(resetToken.expiresAt);
    if (expiresAt < new Date()) {
      return errorResponse('This reset token has expired', 400);
    }

    // Get user
    const userResult = await docClient.send(
      new GetCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${resetToken.userId}`,
          SK: 'METADATA',
        },
      })
    );

    if (!userResult.Item) {
      return errorResponse('User not found', 404);
    }

    const user = userResult.Item;

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update user password
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `USER#${resetToken.userId}`,
          SK: 'METADATA',
        },
        UpdateExpression: 'SET passwordHash = :passwordHash, updatedAt = :updatedAt',
        ExpressionAttributeValues: {
          ':passwordHash': newPasswordHash,
          ':updatedAt': new Date().toISOString(),
        },
      })
    );

    // Mark token as used
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: {
          PK: `RESET_TOKEN#${hashedToken}`,
          SK: 'METADATA',
        },
        UpdateExpression: 'SET used = :used, usedAt = :usedAt',
        ExpressionAttributeValues: {
          ':used': true,
          ':usedAt': new Date().toISOString(),
        },
      })
    );

    // Revoke all active sessions for security
    const sessionsResult = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: 'PK = :userId AND begins_with(SK, :sessionPrefix)',
        ExpressionAttributeValues: {
          ':userId': `USER#${resetToken.userId}`,
          ':sessionPrefix': 'SESSION#',
        },
      })
    );

    if (sessionsResult.Items && sessionsResult.Items.length > 0) {
      const chunks = [];
      for (let i = 0; i < sessionsResult.Items.length; i += 25) {
        chunks.push(sessionsResult.Items.slice(i, i + 25));
      }

      for (const chunk of chunks) {
        await docClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [tableName]: chunk.map((item) => ({
                DeleteRequest: {
                  Key: {
                    PK: item.PK,
                    SK: item.SK,
                  },
                },
              })),
            },
          })
        );
      }
    }

    // Send confirmation email
    try {
      await sendPasswordResetConfirmationEmail(user.email, user.firstName);
    } catch (emailError) {
      console.error('Failed to send password reset confirmation email:', emailError);
      // Continue execution - password was reset successfully
    }

    return successResponse({
      message: 'Password reset successfully. All sessions have been revoked for security.',
    });
  } catch (error: any) {
    console.error('Reset password error:', error);
    return errorResponse('Failed to reset password');
  }
};
