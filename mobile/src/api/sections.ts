import apiClient from './client';

export interface Section {
  sectionId: string;
  courseId: string;
  title: string;
  description: string;
  order: number;
  lessonCount: number;
  duration: number;
  isPublished: boolean;
}

export const sectionsAPI = {
  list: async (courseId: string) => {
    const response = await apiClient.get(`/courses/${courseId}/sections`);
    return response.data;
  },

  create: async (courseId: string, data: { title: string; description?: string }) => {
    const response = await apiClient.post(`/courses/${courseId}/sections`, data);
    return response.data;
  },

  update: async (courseId: string, sectionId: string, data: any) => {
    const response = await apiClient.put(`/courses/${courseId}/sections/${sectionId}`, data);
    return response.data;
  },

  delete: async (courseId: string, sectionId: string) => {
    const response = await apiClient.delete(`/courses/${courseId}/sections/${sectionId}`);
    return response.data;
  },

  reorder: async (courseId: string, sectionOrder: any[]) => {
    const response = await apiClient.post(`/courses/${courseId}/sections/reorder`, {
      sectionOrder,
    });
    return response.data;
  },
};