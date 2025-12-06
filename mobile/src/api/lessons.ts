
import apiClient from './client';

export interface Lesson {
  lessonId: string;
  courseId: string;
  sectionId: string;
  title: string;
  description: string;
  type: 'VIDEO' | 'ARTICLE' | 'QUIZ';
  videoUrl?: string;
  videoDuration?: number;
  order: number;
  isPublished: boolean;
  isFree: boolean;
}

export const lessonsAPI = {
  create: async (courseId: string, data: any) => {
    const response = await apiClient.post(`/courses/${courseId}/lessons`, data);
    return response.data;
  },

  update: async (courseId: string, lessonId: string, data: any) => {
    const response = await apiClient.put(`/courses/${courseId}/lessons/${lessonId}`, data);
    return response.data;
  },

  delete: async (courseId: string, lessonId: string) => {
    const response = await apiClient.delete(`/courses/${courseId}/lessons/${lessonId}`);
    return response.data;
  },

  reorder: async (courseId: string, sectionId: string, lessonOrder: any[]) => {
    const response = await apiClient.post(`/courses/${courseId}/lessons/reorder`, {
      sectionId,
      lessonOrder,
    });
    return response.data;
  },
};
