import crypto from 'crypto';

/**
 * Generate a secure random token for password reset
 * @param length - Length of the token (default: 32 bytes = 64 hex characters)
 * @returns Hex-encoded random token
 */
export const generateResetToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Hash a token for secure storage
 * @param token - The token to hash
 * @returns SHA-256 hash of the token
 */
export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Generate a secure session ID
 * @returns Random session ID
 */
export const generateSessionId = (): string => {
  return crypto.randomBytes(16).toString('hex');
};
