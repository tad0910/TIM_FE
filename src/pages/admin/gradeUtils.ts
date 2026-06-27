import { parseBackendDate } from '../../utils/timeFormat';

export const formatDate = (value?: string | number[] | null) => {
  if (!value) return '—';
  const date = parseBackendDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('vi-VN');
};

export const formatDateTime = (value?: string | number[] | null) => {
  if (!value) return '—';
  const date = parseBackendDate(value);
  if (!date) return '—';
  return `${date.toLocaleDateString('vi-VN')} ${date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
};

export const DEFAULT_GRADE_COMPONENTS: Array<{ name: string; maxScore: number; weightPercent?: number }> = [
  { name: 'Điểm lý thuyết', maxScore: 10, weightPercent: 50 },
  { name: 'Điểm thực hành', maxScore: 10, weightPercent: 50 },
];

export const DEFAULT_COMPONENT_NAMES = DEFAULT_GRADE_COMPONENTS.map((component) => component.name);

export interface ComponentColumnConfig {
  columns: string[];
  usingFallback: boolean;
}

export const resolveComponentColumns = (components?: string[] | null): ComponentColumnConfig => {
  const hasCustomComponents = Boolean(components && components.length > 0);
  return {
    columns: hasCustomComponents ? (components as string[]) : DEFAULT_COMPONENT_NAMES,
    usingFallback: !hasCustomComponents,
  };
};

export const formatScore = (score: number | string | undefined): string => {
  if (score === undefined || score === null) return '-';
  if (typeof score === 'number') {
    return Number.isInteger(score) ? score.toString() : score.toFixed(1);
  }
  const parsed = parseFloat(score);
  return Number.isNaN(parsed) ? '-' : parsed.toFixed(1);
};


