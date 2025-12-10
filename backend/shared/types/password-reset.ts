export interface PasswordResetToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: string;
  createdAt: string;
  used: boolean;
}

export interface RequestPasswordResetRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface VerifyResetTokenRequest {
  token: string;
}
