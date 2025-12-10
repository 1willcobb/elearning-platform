import apiClient from './client';

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: {
    userId: string;
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    roles: string[];
  };
}

export interface RequestPasswordResetRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface VerifyResetTokenResponse {
  valid: boolean;
  email: string;
  message: string;
}

export const authApi = {
  register: async (data: RegisterRequest): Promise<TokenResponse> => {
    const response = await apiClient.post('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<TokenResponse> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<TokenResponse> => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  verifyToken: async (token: string): Promise<{ valid: boolean; user: any }> => {
    const response = await apiClient.get('/auth/verify', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  },

  requestPasswordReset: async (
    data: RequestPasswordResetRequest
  ): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/password-reset/request', data);
    return response.data;
  },

  verifyResetToken: async (token: string): Promise<VerifyResetTokenResponse> => {
    const response = await apiClient.get(
      `/auth/password-reset/verify?token=${token}`
    );
    return response.data;
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/password-reset/reset', data);
    return response.data;
  },
};
