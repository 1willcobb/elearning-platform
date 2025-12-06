import apiClient from './client';

export const progressAPI = {
  update: async (data: {
    courseId: string;
    lessonId: string;
    watchTime: number;
    completed: boolean;
  }) => {
    const response = await apiClient.post('/progress', data);
    return response.data;
  },

  get: async (courseId: string) => {
    const response = await apiClient.get(`/progress/${courseId}`);
    return response.data;
  },
};