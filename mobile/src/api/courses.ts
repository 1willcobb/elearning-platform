import apiClient from './client';

export interface Course {
  courseId: string;
  title: string;
  description: string;
  thumbnail: string;
  instructorName: string;
  price: number;
  discountPrice?: number;
  currency: string;
  category: string;
  level: string;
  totalStudents: number;
  averageRating: number;
  totalDuration: number;
  totalLessons: number;
}

export interface CreateCourseData {
  title: string;
  description: string;
  category: string;
  price: number;
  level: string;
}

export const coursesAPI = {
  // Get all courses
  list: async (params?: { category?: string; limit?: number }) => {
    const response = await apiClient.get('/courses', { params });
    return response.data;
  },

  // Get single course
  get: async (courseId: string) => {
    const response = await apiClient.get(`/courses/${courseId}`);
    return response.data;
  },

  // Create course
  create: async (data: CreateCourseData) => {
    const response = await apiClient.post('/courses', data);
    return response.data;
  },

  // Update course
  update: async (courseId: string, data: Partial<CreateCourseData>) => {
    const response = await apiClient.put(`/courses/${courseId}`, data);
    return response.data;
  },

  // Delete course
  delete: async (courseId: string) => {
    const response = await apiClient.delete(`/courses/${courseId}`);
    return response.data;
  },

  // Enroll in course
  enroll: async (courseId: string) => {
    const response = await apiClient.post(`/courses/${courseId}/enroll`);
    return response.data;
  },
};