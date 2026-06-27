export interface Course {
  id: number;
  courseName: string;
  description: string;
  startDate: string;
  tuitionFee: number;
}

export interface CourseDisplay extends Course {
  progress?: number;
  isEnrolled?: boolean;
  enrollmentDate?: string;
  instructorName?: string;
  studentCount?: number;
  duration?: string;
  level?: string;
  category?: string;
}

export interface CreateCourseRequest {
  courseName: string;
  description: string;
  startDate: string;
  tuitionFee: number;
}

export interface UpdateCourseRequest {
  courseName: string;
  description: string;
  startDate: string;
  tuitionFee: number;
}
