export interface School {
  schoolId: string;
  name: string;
  description: string;
  adminId: string;
  adminName: string;
  logo?: string;
  website?: string;
  status: 'ACTIVE' | 'INACTIVE';
  courseIds: string[];
  totalCourses: number;
  totalStudents: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSchoolRequest {
  name: string;
  description: string;
  logo?: string;
  website?: string;
}

export interface UpdateSchoolRequest {
  name?: string;
  description?: string;
  logo?: string;
  website?: string;
  status?: 'ACTIVE' | 'INACTIVE';
}
