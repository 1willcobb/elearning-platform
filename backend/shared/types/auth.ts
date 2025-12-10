export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}

export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  roles: UserRole[];
  iat?: number;
  exp?: number;
}

export interface AuthUser {
  userId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: UserRole[];
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  isEmailVerified: boolean;
}

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
    roles: UserRole[];
  };
}
