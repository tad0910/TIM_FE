import { api } from "./api";
import type { 
  Course, 
  CourseDisplay,
  CreateCourseRequest, 
  UpdateCourseRequest 
} from "../types/course";
import type { ClassInfo } from "../types/class";

export type { 
  Course, 
  CourseDisplay,
  CreateCourseRequest, 
  UpdateCourseRequest 
} from "../types/course";

export const getAllCourses = async (): Promise<Course[]> => {
  return api.get<Course[]>("/courses");
};

export const getCourseById = async (id: number): Promise<Course> => {
  return api.get<Course>(`/courses/${id}`);
};

export const createCourse = async (data: CreateCourseRequest): Promise<Course> => {
  return api.post<Course>("/courses", data);
};

export const updateCourse = async (id: number, data: UpdateCourseRequest): Promise<Course> => {
  return api.put<Course>(`/courses/${id}`, data);
};

export const deleteCourse = async (id: number): Promise<void> => {
  return api.delete<void>(`/courses/${id}`);
};

export const searchCourses = async (keyword: string): Promise<Course[]> => {
  return api.get<Course[]>(`/courses/search?keyword=${encodeURIComponent(keyword)}`);
};

export const getCoursesWithUserInfo = async (): Promise<CourseDisplay[]> => {
  try {
    const courses = await getAllCourses();
    
    const coursesWithUserInfo: CourseDisplay[] = courses.map(course => {
      return {
        ...course,
        progress: 0,
        isEnrolled: false,
        enrollmentDate: undefined,
        instructorName: "Giảng viên " + course.id,
        studentCount: Math.floor(Math.random() * 50) + 10,
        duration: "3 tháng",
        level: ["Cơ bản", "Trung bình", "Nâng cao"][Math.floor(Math.random() * 3)],
        category: ["Lập trình", "Web Development", "Data Science"][Math.floor(Math.random() * 3)]
      };
    });
    
    return coursesWithUserInfo;
  } catch (error) {
    console.error('Error fetching courses with user info:', error);
    throw new Error(`Failed to fetch courses: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getEnrolledCourses = async (): Promise<CourseDisplay[]> => {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const userClassesResponse = await api.get(`/users/${userId}/classes`);
    
    let userClasses: Array<{
      classId: number;
      userId: number;
      role: string;
      joinDate: string;
    }> = [];
    
    if (Array.isArray(userClassesResponse)) {
      userClasses = userClassesResponse;
    } else if (userClassesResponse && typeof userClassesResponse === 'object') {
      const response = userClassesResponse as Record<string, unknown>;
      if (response.data && Array.isArray(response.data)) {
        userClasses = response.data;
      } else if (response.classes && Array.isArray(response.classes)) {
        userClasses = response.classes;
      } else if (response.members && Array.isArray(response.members)) {
        userClasses = response.members;
      } else {
        console.warn('Unexpected userClasses response format:', userClassesResponse);
        userClasses = [];
      }
    }
    
    const courses = await getAllCourses();
    
    const enrolledCourses: CourseDisplay[] = courses
      .filter(course => userClasses.some(uc => uc.classId === course.id))
      .map(course => {
        const userClass = userClasses.find(uc => uc.classId === course.id);
        
        return {
          ...course,
          progress: Math.floor(Math.random() * 100),
          isEnrolled: true,
          enrollmentDate: userClass ? userClass.joinDate : new Date().toISOString(),
          instructorName: "Giảng viên " + course.id,
          studentCount: Math.floor(Math.random() * 50) + 10,
          duration: "3 tháng",
          level: ["Cơ bản", "Trung bình", "Nâng cao"][Math.floor(Math.random() * 3)],
          category: ["Lập trình", "Web Development", "Data Science"][Math.floor(Math.random() * 3)]
        };
      });
    
    return enrolledCourses;
  } catch (error) {
    console.error('Error fetching enrolled courses:', error);
    throw new Error(`Failed to fetch enrolled courses: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getUserClassInfo = async (courseId: number): Promise<ClassInfo | null> => {
  try {
    const userId = localStorage.getItem('userId');
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const userClassesResponse = await api.get(`/users/${userId}/classes`);
    
    let userClasses: Array<{
      classId: number;
      userId: number;
      role: string;
      joinDate: string;
    }> = [];
    
    if (Array.isArray(userClassesResponse)) {
      userClasses = userClassesResponse;
    } else if (userClassesResponse && typeof userClassesResponse === 'object') {
      const response = userClassesResponse as Record<string, unknown>;
      if (response.data && Array.isArray(response.data)) {
        userClasses = response.data;
      } else if (response.classes && Array.isArray(response.classes)) {
        userClasses = response.classes;
      } else if (response.members && Array.isArray(response.members)) {
        userClasses = response.members;
      }
    }
    
    const userClass = userClasses.find(uc => uc.classId === courseId);
    
    if (userClass) { 
      return await api.get<ClassInfo>(`/classes/${courseId}`);
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user class info:', error);
    throw new Error(`Failed to fetch user class info: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export default {
  getAllCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deleteCourse,
  searchCourses,
  getCoursesWithUserInfo,
  getEnrolledCourses,
  getUserClassInfo
};
