import apiClient from './client';

export const usersAPI = {
  createProfile: async (data: {
    userId: string;
    email: string;
    name: string;
    role?: string;
  }) => {
    const response = await apiClient.post('/users/profile', data);
    return response.data;
  },

  getProfile: async (userId: string) => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  updateProfile: async (userId: string, data: any) => {
    const response = await apiClient.put(`/users/${userId}/profile`, data);
    return response.data;
  },

  updateSettings: async (userId: string, data: any) => {
    const response = await apiClient.put(`/users/${userId}/settings`, data);
    return response.data;
  },
};