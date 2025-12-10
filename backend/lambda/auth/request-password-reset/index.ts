import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { QueryCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import Joi from 'joi';
import { getDynamoDBClient, getTableName } from '../../../shared/utils/db';
import { successResponse, errorResponse, validationErrorResponse } from '../../../shared/utils/response';
import { sendPasswordResetEmail } from '../../../shared/utils/email';
import { generateResetToken, hashToken } from '../../../shared/utils/tokens';
import { RequestPasswordResetRequest } from '../../../shared/types/password-reset';

const docClient = getDynamoDBClient();
const tableName = getTableName();

const requestSchema = Joi.object({
  email: Joi.string().email().required(),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const body: RequestPasswordResetRequest = JSON.parse(event.body || '{}');

    // Validate request
    const { error } = requestSchema.validate(body);
    if (error) {
      return validationErrorResponse(error.details);
    }

    const { email } = body;

    // Find user by email using GSI1
    const result = await docClient.send(
      new QueryCommand({
        TableName: tableName,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :email',
        ExpressionAttributeValues: {
          ':email': `EMAIL#${email.toLowerCase()}`,
        },
        Limit: 1,
      })
    );

    // Always return success to prevent email enumeration
    // Don't reveal if the email exists or not
    if (!result.Items || result.Items.length === 0) {
      // Return success but don't send email
      return successResponse({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    const user = result.Items[0];

    // Check if user is active
    if (!user.isActive) {
      return successResponse({
        message: 'If an account with that email exists, a password reset link has been sent.',
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const hashedToken = hashToken(resetToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    // Store reset token in database
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: {
          PK: `RESET_TOKEN#${hashedToken}`,
          SK: 'METADATA',
          EntityType: 'PasswordResetToken',
          token: hashedToken,
          userId: user.userId,
          email: user.email,
          createdAt: now.toISOString(),
          expiresAt: expiresAt.toISOString(),
          used: false,
          GSI1PK: `USER#${user.userId}#RESET_TOKENS`,
          GSI1SK: `TOKEN#${now.toISOString()}`,
        },
      })
    );

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken, user.firstName);
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError);
      // Continue execution - we don't want to reveal email sending errors
    }

    return successResponse({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error: any) {
    console.error('Request password reset error:', error);
    return errorResponse('Failed to process password reset request');
  }
};
