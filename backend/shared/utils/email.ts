import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';

const STAGE = process.env.STAGE || 'local';
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@elearning.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// SES client for production
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Nodemailer for local development (console logging)
const localTransporter = nodemailer.createTransport({
  streamTransport: true,
  newline: 'unix',
  buffer: true,
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  if (STAGE === 'local') {
    // For local development, just log the email
    console.log('\n📧 ========== EMAIL PREVIEW ==========');
    console.log('To:', options.to);
    console.log('Subject:', options.subject);
    console.log('');

    // Extract and display the actual token/link for easy testing
    const tokenMatch = (options.text || options.html).match(/token=([a-f0-9]{64})/);
    if (tokenMatch) {
      console.log('🔑 RESET TOKEN:', tokenMatch[1]);
      console.log('🔗 CLICK THIS LINK:', `${FRONTEND_URL}/reset-password?token=${tokenMatch[1]}`);
      console.log('');
      console.log('⚠️  NOTE: The raw email below shows "=3D" in the HTML - this is normal!');
      console.log('   Email clients automatically decode this. The link above is what users see.');
    }

    console.log('\n📄 Plain Text Body:');
    if (options.text) {
      console.log(options.text.trim());
    }

    console.log('\n📧 ====================================\n');
    return;
  }

  // For production, use AWS SES
  const params = {
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: [options.to],
    },
    Message: {
      Subject: {
        Data: options.subject,
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: options.html,
          Charset: 'UTF-8',
        },
        ...(options.text && {
          Text: {
            Data: options.text,
            Charset: 'UTF-8',
          },
        }),
      },
    },
  };

  await sesClient.send(new SendEmailCommand(params));
};

export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string,
  firstName: string
): Promise<void> => {
  const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin: 20px 0;
        }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .warning { color: #d32f2f; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Reset Request</h1>
        </div>
        <div class="content">
          <p>Hi ${firstName},</p>
          <p>We received a request to reset your password for your E-Learning Platform account.</p>
          <p>Click the button below to reset your password:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
          <p class="warning">This link will expire in 1 hour.</p>
          <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} E-Learning Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hi ${firstName},

    We received a request to reset your password for your E-Learning Platform account.

    Click the link below to reset your password:
    ${resetUrl}

    This link will expire in 1 hour.

    If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

    © ${new Date().getFullYear()} E-Learning Platform. All rights reserved.
  `;

  await sendEmail({
    to: email,
    subject: 'Reset Your Password - E-Learning Platform',
    html,
    text,
  });
};

export const sendPasswordResetConfirmationEmail = async (
  email: string,
  firstName: string
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
        .success { color: #4CAF50; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Password Changed Successfully</h1>
        </div>
        <div class="content">
          <p>Hi ${firstName},</p>
          <p class="success">Your password has been successfully changed.</p>
          <p>If you made this change, you can safely ignore this email.</p>
          <p>If you did not change your password, please contact our support team immediately at support@elearning.com</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} E-Learning Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hi ${firstName},

    Your password has been successfully changed.

    If you made this change, you can safely ignore this email.

    If you did not change your password, please contact our support team immediately at support@elearning.com

    © ${new Date().getFullYear()} E-Learning Platform. All rights reserved.
  `;

  await sendEmail({
    to: email,
    subject: 'Password Changed - E-Learning Platform',
    html,
    text,
  });
};

export const sendWelcomeEmail = async (
  email: string,
  firstName: string
): Promise<void> => {
  const loginUrl = `${FRONTEND_URL}/login`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background-color: #f9f9f9; }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin: 20px 0;
        }
        .footer { padding: 20px; text-align: center; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to E-Learning Platform!</h1>
        </div>
        <div class="content">
          <p>Hi ${firstName},</p>
          <p>Welcome to the E-Learning Platform! We're excited to have you on board.</p>
          <p>You can now:</p>
          <ul>
            <li>Browse and enroll in courses</li>
            <li>Track your learning progress</li>
            <li>Create your own school and become an instructor</li>
          </ul>
          <p style="text-align: center;">
            <a href="${loginUrl}" class="button">Start Learning</a>
          </p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} E-Learning Platform. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hi ${firstName},

    Welcome to the E-Learning Platform! We're excited to have you on board.

    You can now:
    - Browse and enroll in courses
    - Track your learning progress
    - Create your own school and become an instructor

    Start learning: ${loginUrl}

    © ${new Date().getFullYear()} E-Learning Platform. All rights reserved.
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to E-Learning Platform!',
    html,
    text,
  });
};
