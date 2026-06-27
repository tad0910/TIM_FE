export interface ClassInfo {
  id: number;
  className: string;
  description: string;
  members: Member[];
  programId?: number;
  jobsEnabled?: boolean;
  program?: {
    id: number;
    name: string;
    description?: string;
  };
}

export interface Member {
  id: number;
  userId: number;
  role: string;
  joinDate: string;
  user?: UserInfo;
}

export interface UserInfo {
  id: number;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImage?: string;
}

export interface ClassDisplay extends ClassInfo {
  courseId?: number;
  courseName?: string;
  progress?: number;
  instructorCount?: number;
  studentCount?: number;
  startDate?: string;
  endDate?: string;
  schedule?: string;
  location?: string;
  maxStudents?: number;
  isEnrolled?: boolean;
}
