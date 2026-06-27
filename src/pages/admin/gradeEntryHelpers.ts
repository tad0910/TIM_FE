import type { GradebookStudentRow } from '../../services/gradeApi';

export type GradeComponentField = keyof Pick<GradebookStudentRow, 'theoryScore' | 'practiceScore'>;

export const THEORY_COMPONENT = 'Điểm lý thuyết';
export const PRACTICE_COMPONENT = 'Điểm thực hành';

export const componentNameToField = (componentName: string): GradeComponentField | null => {
  if (componentName === THEORY_COMPONENT) return 'theoryScore';
  if (componentName === PRACTICE_COMPONENT) return 'practiceScore';
  return null;
};

export const parseScoreValue = (value?: number | string | null) => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') {
    return Number.isNaN(value) ? undefined : value;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const todayString = () => new Date().toISOString().slice(0, 10);

