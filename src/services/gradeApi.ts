import { api } from "./api";

export interface StudentGradeDTO {
  gradeId?: number;
  componentName: string;
  score: number | string;
  maxScore: number | string;
  weightPercent: number | string;
  lastUpdated?: string;
}

export interface GradebookDTO {
  classModuleId: number;
  className: string;
  moduleName: string;
  components: string[];
  students: GradebookStudentRow[];
  currentPage: number;
  totalElements: number;
  totalPages: number;
}

export interface GradebookStudentRow {
  studentId: number;
  studentName: string;
  gradeId?: number;
  theoryScore?: number | string | null;
  practiceScore?: number | string | null;
  entryDate?: string | null;
  lastUpdatedAt?: string | null;
  theoryScoreEntryDate?: string | null;
  practiceScoreEntryDate?: string | null;
  theoryScoreLastUpdatedAt?: string | null;
  practiceScoreLastUpdatedAt?: string | null;
}

export interface GradeHistoryDTO {
  id: number;
  oldScore?: number | string | null;
  newScore?: number | string | null;
  componentChanged?: string;
  changedByUserName?: string;
  changedAt?: string;
  studentDisplayName?: string;
}

export interface GradeDTO {
  id: number;
  studentId: number;
  classModuleId: number;
  moduleName: string;
  theoryScore?: number | string | null;
  practiceScore?: number | string | null;
  entryDate?: string;
}

export interface BatchGradeUpdateRequest {
  classModuleId: number;
  entryDate: string;
  scores: Array<{
    studentId: number;
    components: Record<string, number | null>;
  }>;
}

const DEFAULT_MAX_SCORE = 10;
const DEFAULT_WEIGHT_PERCENT = 50;
const THEORY_COMPONENT = 'Điểm lý thuyết';
const PRACTICE_COMPONENT = 'Điểm thực hành';

const mapMyGradesToComponents = (grade?: GradeDTO | null): StudentGradeDTO[] => {
  if (!grade) return [];

  const items: StudentGradeDTO[] = [];

  if (grade.theoryScore !== null && grade.theoryScore !== undefined) {
    items.push({
      gradeId: grade.id,
      componentName: THEORY_COMPONENT,
      score: grade.theoryScore,
      maxScore: DEFAULT_MAX_SCORE,
      weightPercent: DEFAULT_WEIGHT_PERCENT,
      lastUpdated: grade.entryDate,
    });
  }

  if (grade.practiceScore !== null && grade.practiceScore !== undefined) {
    items.push({
      gradeId: grade.id,
      componentName: PRACTICE_COMPONENT,
      score: grade.practiceScore,
      maxScore: DEFAULT_MAX_SCORE,
      weightPercent: DEFAULT_WEIGHT_PERCENT,
      lastUpdated: grade.entryDate,
    });
  }

  return items;
};

export const getMyGrades = async (classModuleId: number): Promise<StudentGradeDTO[]> => {
  const response = await api.get<GradeDTO>(`/grades/class-modules/${classModuleId}/my-grades`);
  return mapMyGradesToComponents(response);
};

type GradebookQueryOptions = {
  entryDate?: string | null;
  missingEntryDateOnly?: boolean;
};

export const getModuleGradebook = async (
  classModuleId: number,
  page: number = 0,
  size: number = 20,
  options?: GradebookQueryOptions
): Promise<GradebookDTO> => {
  const params: Record<string, string | number> = {
    page,
    size,
  };

  if (options?.entryDate) {
    params.entryDate = options.entryDate;
  }
  if (options?.missingEntryDateOnly) {
    params.missingEntryDateOnly = options.missingEntryDateOnly ? 'true' : 'false';
  }

  return api.get<GradebookDTO>(`/grades/class-modules/${classModuleId}/gradebook`, params);
};

export const batchCreateOrUpdateGrades = async (payload: BatchGradeUpdateRequest): Promise<void> => {
  await api.post<void>('/grades/batch', payload);
};

export const getGradeHistory = async (gradeId: number): Promise<GradeHistoryDTO[]> => {
  return api.get<GradeHistoryDTO[]>(`/grades/${gradeId}/history`);
};

export default {
  getMyGrades,
  getModuleGradebook,
  batchCreateOrUpdateGrades,
  getGradeHistory,
};


