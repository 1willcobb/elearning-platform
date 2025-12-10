import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../api/auth';

interface User {
  userId: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  roles: string[];
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (data: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load stored auth data on mount
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedAccessToken = await SecureStore.getItemAsync('accessToken');
      const storedRefreshToken = await SecureStore.getItemAsync('refreshToken');
      const storedUser = await SecureStore.getItemAsync('user');

      if (storedAccessToken && storedRefreshToken && storedUser) {
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Failed to load stored auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await authApi.login({ email, password });

    await SecureStore.setItemAsync('accessToken', response.accessToken);
    await SecureStore.setItemAsync('refreshToken', response.refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(response.user));

    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    setUser(response.user);
  };

  const signup = async (data: any) => {
    const response = await authApi.register(data);

    await SecureStore.setItemAsync('accessToken', response.accessToken);
    await SecureStore.setItemAsync('refreshToken', response.refreshToken);
    await SecureStore.setItemAsync('user', JSON.stringify(response.user));

    setAccessToken(response.accessToken);
    setRefreshToken(response.refreshToken);
    setUser(response.user);
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('accessToken');
    await SecureStore.deleteItemAsync('refreshToken');
    await SecureStore.deleteItemAsync('user');

    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    SecureStore.setItemAsync('user', JSON.stringify(updatedUser));
  };

  const isAuthenticated = !!user && !!accessToken;
  const isSuperAdmin = user?.roles.includes('SUPER_ADMIN') || false;
  const isAdmin = user?.roles.includes('ADMIN') || isSuperAdmin || false;

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        refreshToken,
        isLoading,
        isAuthenticated,
        isSuperAdmin,
        isAdmin,
        login,
        signup,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
