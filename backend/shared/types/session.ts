export interface Session {
  sessionId: string;
  userId: string;
  refreshToken: string;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    platform?: string;
  };
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isActive: boolean;
}

export interface SessionInfo {
  sessionId: string;
  deviceInfo?: {
    userAgent?: string;
    ip?: string;
    platform?: string;
  };
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  isActive: boolean;
  isCurrent: boolean;
}
