import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import TableSkeleton from '../../../components/TableSkeleton';
import NotificationPopup from '../../../components/NotificationPopup';
import Pagination from '../../../components/Pagination';
import GradeEntryModal from '../../../components/GradeEntryModal';
import { useNotification } from '../../../hooks/useNotification';
import { useAuthStore } from '../../../store/useAuthStore';
import { api } from '../../../services/api';
// import { parseBackendDate } from '../../../utils/timeFormat';
import {
  getClassModules,
  type ClassModuleDTO,
} from '../../../services/classApi';
import {
  batchCreateOrUpdateGrades,
  getModuleGradebook,
  getMyGrades,
  type BatchGradeUpdateRequest,
  type GradebookDTO,
  type GradebookStudentRow,
} from '../../../services/gradeApi';
import {
  formatScore,
  resolveComponentColumns,
} from '../../../pages/admin/gradeUtils';
import {
  componentNameToField,
  todayString,
} from '../../../pages/admin/gradeEntryHelpers';

interface CourseScore {
  id: number;
  classModuleId: number;
  courseName: string;
  className?: string;
  assignments: Array<{
    name: string;
    score: number;
    maxScore: number;
    date: string;
  }>;
  midterm?: { score: number; maxScore: number; date: string };
  final?: { score: number; maxScore: number; date: string };
  average: number;
}

interface UserClass {
  classId: number;
  userId: number;
  role: string;
  joinDate: string;
  className?: string;
}

interface ModuleEntryStats {
  moduleId: number;
  latestEntryDate?: string | null;
  totalEntries: number;
  studentsWithScores: number;
}

interface ModuleEntryGroup {
  moduleId: number;
  entryDate: string;
  students: GradebookStudentRow[];
  studentCount: number;
  enteredBy?: string | null;
  createdAt?: string | null;
}

const TEACHER_PAGE_SIZE = 20;

const isTeacherRole = (role?: string) => {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return (
    normalized.includes('giao_vien') ||
    normalized.includes('teacher') ||
    normalized.includes('lecturer')
  );
};

export default function ScoresPage() {
  const { user } = useAuthStore();
  const { notification, showSuccess, showWarning, hideNotification, showApiError } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightRef = useRef<HTMLTableRowElement | null>(null);

  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [scores, setScores] = useState<CourseScore[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userClasses, setUserClasses] = useState<UserClass[]>([]);
  
  const highlightClassModuleId = searchParams.get('classModuleId');
  const highlightComponent = searchParams.get('component');

  const teacherClasses = useMemo(
    () => userClasses.filter((cls) => isTeacherRole(cls.role)),
    [userClasses],
  );
  const isTeacher = useMemo(() => {
    const role = user?.role?.toLowerCase() ?? '';
    return role.includes('teacher') || role.includes('giao_vien') || teacherClasses.length > 0;
  }, [user?.role, teacherClasses.length]);

  const filterModulesForCurrentTeacher = useCallback(
    (modules: ClassModuleDTO[]) => {
      const currentUserId = user?.id;
      if (!currentUserId) return modules;
      return modules.filter((module) => {
        const teachers = module.teachers ?? [];
        return teachers.some((teacher) => Number(teacher.userId) === Number(currentUserId));
      });
    },
    [user?.id],
  );

  const [isAddMode, setIsAddMode] = useState<boolean>(false);
  const [viewLevel, setViewLevel] = useState<'modules' | 'moduleEntries' | 'entryDetail'>('modules');
  const [selectedModuleForDetail, setSelectedModuleForDetail] = useState<ClassModuleDTO | null>(null);
  const [selectedEntryGroup, setSelectedEntryGroup] = useState<ModuleEntryGroup | null>(null);
  const [moduleEntryStats, setModuleEntryStats] = useState<Record<number, ModuleEntryStats>>({});
  const [moduleEntryGroupsMap, setModuleEntryGroupsMap] = useState<Record<number, ModuleEntryGroup[]>>({});
  const [moduleStatsLoading, setModuleStatsLoading] = useState<Record<number, boolean>>({});
  const [moduleGroupLoading, setModuleGroupLoading] = useState<Record<number, boolean>>({});

  const [teacherSelectedClassId, setTeacherSelectedClassId] = useState<number | null>(null);
  const [teacherClassModules, setTeacherClassModules] = useState<ClassModuleDTO[]>([]);
  const [teacherSelectedModuleId, setTeacherSelectedModuleId] = useState<number | null>(null);
  const [teacherGradebook, setTeacherGradebook] = useState<GradebookDTO | null>(null);
  const [teacherStartDate, setTeacherStartDate] = useState<string>('');
  const [teacherEndDate, setTeacherEndDate] = useState<string>('');
  const [teacherCurrentPage, setTeacherCurrentPage] = useState(0);
  const [teacherEntryLoading, setTeacherEntryLoading] = useState(false);
  const [teacherGradeModal, setTeacherGradeModal] = useState<{
    isOpen: boolean;
    studentId: number | null;
    studentName: string;
    currentTheoryScore?: number | string | null;
    currentPracticeScore?: number | string | null;
    entryDate?: string | null;
  }>({
    isOpen: false,
    studentId: null,
    studentName: '',
    entryDate: todayString(),
  });
  const [teacherSavingScore, setTeacherSavingScore] = useState(false);
  const [editingScores, setEditingScores] = useState<Record<string, string>>({});
  const [editingEntryDates, setEditingEntryDates] = useState<Record<number, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const teacherEditorDisplayName = user?.username || user?.email || 'bạn';

  useEffect(() => {
    fetchScores();
  }, []);

  useEffect(() => {
    if (highlightClassModuleId && highlightComponent && !loading && scores.length > 0) {
      const targetCourse = scores.find(course => course.classModuleId === Number(highlightClassModuleId));
      
      if (targetCourse) {
        setSelectedCourse(targetCourse.courseName);
        
        setTimeout(() => {
          const element = document.querySelector(`[data-highlight-course="${targetCourse.id}"][data-highlight-component="${highlightComponent}"]`);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
              const params = new URLSearchParams(window.location.search);
              params.delete('classModuleId');
              params.delete('component');
              setSearchParams(params);
            }, 2000);
          }
        }, 300);
      }
    }
  }, [highlightClassModuleId, highlightComponent, loading, scores, setSearchParams]);

  useEffect(() => {
    if (teacherClasses.length === 0) {
      setTeacherSelectedClassId(null);
      setTeacherClassModules([]);
      setTeacherSelectedModuleId(null);
      setTeacherGradebook(null);
      setSelectedModuleForDetail(null);
      setSelectedEntryGroup(null);
      setViewLevel('modules');
      setModuleEntryStats({});
      setModuleEntryGroupsMap({});
      setModuleStatsLoading({});
      setModuleGroupLoading({});
    }
  }, [teacherClasses]);

  useEffect(() => {
    if (!teacherSelectedClassId) {
      setTeacherClassModules([]);
      setTeacherSelectedModuleId(null);
      setTeacherGradebook(null);
      setSelectedModuleForDetail(null);
      setSelectedEntryGroup(null);
      setViewLevel('modules');
      setModuleEntryStats({});
      setModuleEntryGroupsMap({});
      setModuleStatsLoading({});
      setModuleGroupLoading({});
      return;
    }
    setTeacherSelectedModuleId(null);
    setTeacherClassModules([]);
    void fetchTeacherClassModules(teacherSelectedClassId);
  }, [teacherSelectedClassId]);

  useEffect(() => {
    if (!teacherSelectedModuleId) {
      setTeacherGradebook(null);
      return;
    }
     
    void fetchTeacherGradebook(
      teacherSelectedModuleId,
      teacherCurrentPage,
      TEACHER_PAGE_SIZE,
      undefined, 
    );
  }, [teacherSelectedModuleId, teacherCurrentPage]);

  // Tạm thời không dùng bộ lọc ngày bắt đầu / kết thúc để tránh làm phức tạp giao diện nhập điểm
  // useEffect(() => {
  //   setTeacherCurrentPage(0);
  // }, [teacherStartDate, teacherEndDate]);

  useEffect(() => {
    if (teacherSelectedModuleId) {
      setTeacherCurrentPage(0);
      setTeacherGradeModal({
        isOpen: false,
        studentId: null,
        studentName: '',
        entryDate: todayString(),
      });
      setEditingScores({});
      setEditingEntryDates({});
      setHasUnsavedChanges(false);
    }
  }, [teacherSelectedModuleId]);

  const parseUserClasses = (payload: unknown): UserClass[] => {
    if (Array.isArray(payload)) {
      return payload.map((item: any) => ({
        classId: Number(item.classId ?? item.id ?? 0),
        userId: Number(item.userId ?? user?.id ?? 0),
        role: String(item.role ?? ''),
        joinDate: item.joinDate ?? '',
        className: item.className ?? '',
      }));
    }
    if (payload && typeof payload === 'object' && Array.isArray((payload as any).classes)) {
      return (payload as any).classes.map((item: any) => ({
        classId: Number(item.classId ?? item.id ?? 0),
        userId: Number(item.userId ?? user?.id ?? 0),
        role: String(item.role ?? ''),
        joinDate: item.joinDate ?? '',
        className: item.className ?? '',
      }));
    }
    return [];
  };

  const fetchScores = async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('Người dùng chưa đăng nhập');
      }

      const userClassesResponse = await api.get<unknown>(`/users/${userId}/classes`);
      const joinedClasses: UserClass[] = parseUserClasses(userClassesResponse);
      setUserClasses(joinedClasses);

      const allScores: CourseScore[] = [];

      const studentClasses = joinedClasses.filter((cls) => {
        const role = (cls.role || '').toLowerCase();
        return !role.includes('giao_vien') && !role.includes('teacher') && !role.includes('admin');
      });

      for (const userClass of studentClasses) {
        try {
          const classModules = await getClassModules(userClass.classId);

          for (const classModule of classModules) {
            try {
              const grades = await getMyGrades(classModule.id);

              if (grades.length > 0) {
                const assignments = grades.filter(
                  (g) =>
                    !g.componentName.toLowerCase().includes('giữa kỳ') &&
                    !g.componentName.toLowerCase().includes('cuối kỳ') &&
                    !g.componentName.toLowerCase().includes('midterm') &&
                    !g.componentName.toLowerCase().includes('final'),
                );

                const midterm = grades.find(
                  (g) =>
                    g.componentName.toLowerCase().includes('giữa kỳ') ||
                    g.componentName.toLowerCase().includes('midterm'),
                );

                const final = grades.find(
                  (g) =>
                    g.componentName.toLowerCase().includes('cuối kỳ') ||
                    g.componentName.toLowerCase().includes('final'),
                );

                let totalWeightedScore = 0;
                let totalWeight = 0;

                grades.forEach((grade) => {
                  const scorePercent =
                    Number(grade.maxScore) > 0
                      ? (Number(grade.score) / Number(grade.maxScore)) * 100
                      : 0;
                  const weight = Number(grade.weightPercent) || 1;
                  totalWeightedScore += scorePercent * weight;
                  totalWeight += weight;
                });

                const averagePercent = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;
                const average = averagePercent / 10;

                allScores.push({
                  id: classModule.id,
                  classModuleId: classModule.id,
                  courseName: classModule.moduleName || `Module ${classModule.moduleId}`,
                  className: classModule.className,
                  assignments: assignments.map((a) => ({
                    name: a.componentName,
                    score: Number(a.score),
                    maxScore: Number(a.maxScore),
                    date: a.lastUpdated ? (/* parseBackendDate(a.lastUpdated) */ Array.isArray(a.lastUpdated) ? new Date(a.lastUpdated[0], a.lastUpdated[1] - 1, a.lastUpdated[2]) : new Date(a.lastUpdated as string))?.toLocaleDateString('vi-VN') || '' : '',
                  })),
                  midterm: midterm
                    ? {
                        score: Number(midterm.score),
                        maxScore: Number(midterm.maxScore),
                        date: midterm.lastUpdated
                          ? (/* parseBackendDate(midterm.lastUpdated) */ Array.isArray(midterm.lastUpdated) ? new Date(midterm.lastUpdated[0], midterm.lastUpdated[1] - 1, midterm.lastUpdated[2]) : new Date(midterm.lastUpdated as string))?.toLocaleDateString('vi-VN') || ''
                          : '',
                      }
                    : undefined,
                  final: final
                    ? {
                        score: Number(final.score),
                        maxScore: Number(final.maxScore),
                        date: final.lastUpdated
                          ? (/* parseBackendDate(final.lastUpdated) */ Array.isArray(final.lastUpdated) ? new Date(final.lastUpdated[0], final.lastUpdated[1] - 1, final.lastUpdated[2]) : new Date(final.lastUpdated as string))?.toLocaleDateString('vi-VN') || ''
                          : '',
                      }
                    : undefined,
                  average,
                });
              }
            } catch (err) {
              console.error(`Error fetching grades for class module ${classModule.id}:`, err);
            }
          }
        } catch (err) {
          console.error(`Error fetching modules for class ${userClass.classId}:`, err);
        }
      }

      setScores(allScores);
    } catch (err) {
      console.error('Error fetching scores:', err);
      const message = showApiError(
        err,
        'Không thể tải điểm số. Vui lòng thử lại.',
        'Lỗi tải điểm số',
      );
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeacherClassModules = async (classId: number) => {
    try {
      const modules = await getClassModules(classId);
      const visibleModules = filterModulesForCurrentTeacher(modules);
      setTeacherClassModules(visibleModules);
      setTeacherSelectedModuleId(null);
    } catch (err) {
      console.error('Error fetching class modules for teacher:', err);
      showApiError(
        err,
        'Không thể tải danh sách module cho lớp này.',
        'Lỗi tải module',
      );
      setTeacherClassModules([]);
      setTeacherSelectedModuleId(null);
    }
  };

  const fetchTeacherGradebook = async (
    classModuleId: number,
    page: number,
    size: number,
    options?: { entryDate?: string | null; missingEntryDateOnly?: boolean; startDate?: string | null; endDate?: string | null },
  ) => {
    try {
      setTeacherEntryLoading(true);
      const data = await getModuleGradebook(classModuleId, page, size, options);
      setTeacherGradebook(data);
    } catch (err) {
      console.error('Error fetching teacher gradebook:', err);
      showApiError(
        err,
        'Không thể tải bảng điểm cho module này.',
        'Lỗi tải bảng điểm',
      );
      setTeacherGradebook(null);
    } finally {
      setTeacherEntryLoading(false);
    }
  };

  const hasAnyScore = (student?: GradebookStudentRow) => {
    if (!student) return false;
    const theoryScore = student.theoryScore;
    const practiceScore = student.practiceScore;
    return (
      (theoryScore !== undefined && theoryScore !== null) ||
      (practiceScore !== undefined && practiceScore !== null)
    );
  };

  const getModuleTeacherNames = useCallback(
    (moduleId: number) => {
      const module = teacherClassModules.find((item) => item.id === moduleId);
      if (!module?.teachers || module.teachers.length === 0) {
        return 'Chưa phân công';
      }
      return module.teachers
        .map((teacher) => teacher.userName || teacher.userEmail || `GV #${teacher.userId}`)
        .join(', ');
    },
    [teacherClassModules],
  );

  type GradebookStudentRowWithMeta = GradebookStudentRow & {
    enteredBy?: string | null;
    editorName?: string | null;
    updatedBy?: string | null;
    lastUpdatedBy?: string | null;
    theoryScoreUpdatedBy?: string | null;
    practiceScoreUpdatedBy?: string | null;
    createdAt?: string | null;
    entryCreatedAt?: string | null;
  };

  const getEntryMetadataFromStudent = (
    student: GradebookStudentRowWithMeta,
    fallbackEnteredBy?: string | null,
  ) => {
    const enteredBy =
      student.enteredBy ??
      student.editorName ??
      student.updatedBy ??
      student.lastUpdatedBy ??
      student.theoryScoreUpdatedBy ??
      student.practiceScoreUpdatedBy ??
      fallbackEnteredBy ??
      null;

    const createdAt =
      student.createdAt ??
      student.entryCreatedAt ??
      student.lastUpdatedAt ??
      student.theoryScoreLastUpdatedAt ??
      student.practiceScoreLastUpdatedAt ??
      student.entryDate ??
      student.theoryScoreEntryDate ??
      student.practiceScoreEntryDate ??
      null;

    return { enteredBy, createdAt };
  };

  const groupStudentsByEntryDate = useCallback((
    moduleId: number,
    students: GradebookStudentRow[],
    options?: { fallbackEnteredBy?: string | null },
  ): ModuleEntryGroup[] => {
    const grouped = new Map<string, GradebookStudentRow[]>();
    students.forEach((student) => {
      const key =
        student.entryDate ||
        student.theoryScoreEntryDate ||
        student.practiceScoreEntryDate;
      if (!key) return;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(student);
    });

    return Array.from(grouped.entries())
      .map(([entryDate, rows]) => {
        const firstStudent = rows[0] as GradebookStudentRowWithMeta | undefined;
        const metadata = firstStudent
          ? getEntryMetadataFromStudent(firstStudent, options?.fallbackEnteredBy)
          : { enteredBy: options?.fallbackEnteredBy ?? null, createdAt: null };

        return {
          moduleId,
          entryDate,
          students: rows,
          studentCount: rows.length,
          enteredBy: metadata.enteredBy,
          createdAt: metadata.createdAt,
        };
      })
      .sort((a, b) => {
        const createdA = a.createdAt || a.entryDate;
        const createdB = b.createdAt || b.entryDate;
        const timeA = new Date(createdA).getTime();
        const timeB = new Date(createdB).getTime();
        return timeB - timeA;
      });
  }, []);

  const ensureModuleSummary = useCallback(
    async (moduleId: number, options?: { force?: boolean }) => {
      if (!options?.force && (moduleEntryStats[moduleId] || moduleStatsLoading[moduleId])) {
        return;
      }
      setModuleStatsLoading((prev) => ({ ...prev, [moduleId]: true }));
      setModuleGroupLoading((prev) => ({ ...prev, [moduleId]: true }));
      try {
        const gradebook = await getModuleGradebook(moduleId, 0, 1000);
        const students = gradebook?.students ?? [];
        const studentsWithScoreList = students.filter((student) => hasAnyScore(student));
        const studentsWithScores = studentsWithScoreList.length;
        const fallbackEditor = getModuleTeacherNames(moduleId);
        let entryGroups = groupStudentsByEntryDate(moduleId, students, {
          fallbackEnteredBy: fallbackEditor,
        });

    
        if (entryGroups.length === 0 && studentsWithScores > 0) {
          entryGroups = [
            {
              moduleId,
              entryDate: todayString(),
              students: studentsWithScoreList,
              studentCount: studentsWithScores,
              enteredBy: fallbackEditor,
              createdAt: null,
            },
          ];
        }

        const latestEntryDate = entryGroups[0]?.entryDate ?? null;

        setModuleEntryStats((prev) => ({
          ...prev,
          [moduleId]: {
            moduleId,
            latestEntryDate,
            totalEntries: entryGroups.length,
            studentsWithScores,
          },
        }));
        setModuleEntryGroupsMap((prev) => ({
          ...prev,
          [moduleId]: entryGroups,
        }));
      } catch (err) {
        console.error('Error preparing module summary:', err);
      } finally {
        setModuleStatsLoading((prev) => ({ ...prev, [moduleId]: false }));
        setModuleGroupLoading((prev) => ({ ...prev, [moduleId]: false }));
      }
    },
    [getModuleTeacherNames, groupStudentsByEntryDate, moduleEntryStats, moduleStatsLoading],
  );

  useEffect(() => {
    if (teacherClassModules.length === 0) {
      return;
    }
    teacherClassModules.forEach((module) => {
      void ensureModuleSummary(module.id);
    });
  }, [teacherClassModules, ensureModuleSummary]);

  const handleSaveGrade = async (data: {
    studentId: number | null;
    theoryScore: number | null;
    practiceScore: number | null;
    entryDate?: string | null;
  }) => {
    if (!teacherSelectedModuleId || !data.studentId) {
      showWarning('Thiếu thông tin', 'Vui lòng chọn học viên trước khi lưu điểm.');
      return;
    }
    const effectiveEntryDate = data.entryDate || todayString();
    if (!effectiveEntryDate) {
      showWarning('Thiếu ngày nhập điểm', 'Vui lòng chọn ngày trước khi lưu điểm.');
      return;
    }

    const payload: BatchGradeUpdateRequest = {
      classModuleId: teacherSelectedModuleId,
      entryDate: effectiveEntryDate,
      scores: [
        {
          studentId: data.studentId,
          components: {
            'Điểm lý thuyết': data.theoryScore,
            'Điểm thực hành': data.practiceScore,
          },
        },
      ],
    };

    try {
      setTeacherSavingScore(true);
      await batchCreateOrUpdateGrades(payload);
      showSuccess('Đã lưu điểm số thành công');
      setTeacherGradeModal({
        isOpen: false,
        studentId: null,
        studentName: '',
        entryDate: effectiveEntryDate,
      });
      await fetchTeacherGradebook(
        teacherSelectedModuleId,
        teacherCurrentPage,
        TEACHER_PAGE_SIZE,
        undefined,
      );
      await ensureModuleSummary(teacherSelectedModuleId, { force: true });
    } catch (err) {
      console.error('Error saving teacher grade:', err);
      showApiError(err, 'Không thể lưu điểm số, vui lòng thử lại.', 'Lỗi lưu điểm');
    } finally {
      setTeacherSavingScore(false);
    }
  };

  const handleBatchSaveGrades = async () => {
    if (!teacherSelectedModuleId || !teacherGradebook) {
      showWarning('Thiếu thông tin', 'Vui lòng chọn module trước khi lưu điểm.');
      return;
    }

    const updatesByDate: Record<string, Record<number, { theory?: number | null; practice?: number | null }>> = {};

    const studentsToUpdate = new Set<number>();
    Object.keys(editingScores).forEach(key => {
      const studentId = Number(key.split('_')[0]);
      studentsToUpdate.add(studentId);
    });
    Object.keys(editingEntryDates).forEach(key => {
      studentsToUpdate.add(Number(key));
    });

    studentsToUpdate.forEach(studentId => {
      const student = teacherGradebook.students.find(s => s.studentId === studentId);
      if (!student) return;

      const entryDate = editingEntryDates[studentId] || 
                       (student.entryDate ? new Date(student.entryDate).toISOString().slice(0, 10) : todayString());

      if (!updatesByDate[entryDate]) {
        updatesByDate[entryDate] = {};
      }
      if (!updatesByDate[entryDate][studentId]) {
        updatesByDate[entryDate][studentId] = {};
      }

      const theoryKey = `${studentId}_Điểm lý thuyết`;
      const practiceKey = `${studentId}_Điểm thực hành`;
      
      const theoryField = componentNameToField('Điểm lý thuyết');
      const practiceField = componentNameToField('Điểm thực hành');
      const currentTheory = theoryField ? student[theoryField] : undefined;
      const currentPractice = practiceField ? student[practiceField] : undefined;

      if (editingScores[theoryKey] !== undefined) {
        const value = editingScores[theoryKey];
        updatesByDate[entryDate][studentId].theory = value === '' || value === '—' ? null : Number(value);
      } else {
        updatesByDate[entryDate][studentId].theory = currentTheory !== undefined && currentTheory !== null 
          ? Number(currentTheory) : null;
      }

      if (editingScores[practiceKey] !== undefined) {
        const value = editingScores[practiceKey];
        updatesByDate[entryDate][studentId].practice = value === '' || value === '—' ? null : Number(value);
      } else {
        updatesByDate[entryDate][studentId].practice = currentPractice !== undefined && currentPractice !== null 
          ? Number(currentPractice) : null;
      }
    });

    const allPayloads: BatchGradeUpdateRequest[] = [];
    Object.entries(updatesByDate).forEach(([entryDate, students]) => {
      const scores = Object.entries(students).map(([studentIdStr, components]) => ({
        studentId: Number(studentIdStr),
        components: {
          'Điểm lý thuyết': components.theory ?? null,
          'Điểm thực hành': components.practice ?? null,
        },
      }));

      if (scores.length > 0) {
        allPayloads.push({
          classModuleId: teacherSelectedModuleId,
          entryDate,
          scores,
        });
      }
    });

    if (allPayloads.length === 0) {
      showWarning('Không có thay đổi', 'Vui lòng chỉnh sửa điểm trước khi lưu.');
      return;
    }

    try {
      setTeacherSavingScore(true);
      for (const payload of allPayloads) {
        await batchCreateOrUpdateGrades(payload);
      }
      showSuccess(`Đã lưu điểm số thành công cho ${allPayloads.reduce((sum, p) => sum + p.scores.length, 0)} học viên`);
      
      setEditingScores({});
      setEditingEntryDates({});
      setHasUnsavedChanges(false);
      
      await fetchTeacherGradebook(
        teacherSelectedModuleId,
        teacherCurrentPage,
        TEACHER_PAGE_SIZE,
        undefined,
      );
      await ensureModuleSummary(teacherSelectedModuleId, { force: true });
    } catch (err) {
      console.error('Error saving batch grades:', err);
      showApiError(err, 'Không thể lưu điểm số, vui lòng thử lại.', 'Lỗi lưu điểm');
    } finally {
      setTeacherSavingScore(false);
    }
  };


  const { columns: teacherComponentColumns, usingFallback: teacherUsingFallbackColumns } = useMemo(
    () => resolveComponentColumns(teacherGradebook?.components),
    [teacherGradebook?.components],
  );


  const formatEntryDate = (value?: string | number[] | null) => {
    if (!value) return null;
    // const parsed = parseBackendDate(value);
    const parsed = Array.isArray(value) ? new Date(value[0], value[1] - 1, value[2]) : new Date(value as string);
    if (!parsed || isNaN(parsed.getTime())) return null;
    return parsed.toLocaleDateString('vi-VN');
  };

  const formatDateTime = (value?: string | number[] | null) => {
    if (!value) return null;
    // const parsed = parseBackendDate(value);
    const parsed = Array.isArray(value) ? new Date(value[0], value[1] - 1, value[2]) : new Date(value as string);
    if (!parsed || isNaN(parsed.getTime())) return null;
    return parsed.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFilterDateLabel = () => {
    const startFormatted = teacherStartDate ? formatEntryDate(teacherStartDate) : null;
    const endFormatted = teacherEndDate ? formatEntryDate(teacherEndDate) : null;
    if (startFormatted && endFormatted) {
      return `${startFormatted} - ${endFormatted}`;
    }
    if (startFormatted) return `Từ ${startFormatted}`;
    if (endFormatted) return `Đến ${endFormatted}`;
    return 'Tất cả ngày';
  };

  const getStudentEntryDateLabel = (student: GradebookStudentRow) => {
    const formatted = formatEntryDate(student.entryDate);
    if (formatted) return formatted;
    return '—';
  };


  const filteredScores = selectedCourse === 'all'
    ? scores
    : scores.filter((course) => course.courseName === selectedCourse);

  const renderStudentContent = () => {
    if (filteredScores.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <div className="text-gray-400 mb-2 text-4xl">📝</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Chưa có điểm số</h3>
          <p className="text-gray-600">
            Bạn chưa có điểm số nào trong các khóa học đã hoàn thành.
          </p>
        </div>
      );
    }

    const allAssignmentNames = new Set<string>();
    const hasMidterm = filteredScores.some(c => c.midterm);
    const hasFinal = filteredScores.some(c => c.final);
    
    filteredScores.forEach(course => {
      course.assignments.forEach(assignment => {
        allAssignmentNames.add(assignment.name);
      });
    });

    return (
      <>
        <div className="mb-6 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Khóa học:</label>
            <select
              value={selectedCourse}
              onChange={(event) => setSelectedCourse(event.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tất cả</option>
              {scores.map((course) => (
                <option key={course.id} value={course.courseName}>
                  {course.courseName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                    Khóa học
                  </th>
                  {Array.from(allAssignmentNames).map((name) => (
                    <th
                      key={name}
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                    >
                      {name}
                    </th>
                  ))}
                  {hasMidterm && (
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      Giữa kỳ
                    </th>
                  )}
                  {hasFinal && (
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      Cuối kỳ
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredScores.map((course) => {
                  const isHighlighted = 
                    highlightClassModuleId && 
                    course.classModuleId === Number(highlightClassModuleId);
                  
                  return (
                    <tr
                      key={course.id}
                      ref={isHighlighted ? highlightRef : null}
                      data-highlight-course={course.id}
                      className={`hover:bg-gray-50 ${
                        isHighlighted ? 'bg-indigo-50 border-l-4 border-indigo-400' : ''
                      }`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                        <div className="text-sm font-medium text-gray-900">{course.courseName}</div>
                        {course.className && (
                          <div className="text-sm text-gray-500">{course.className}</div>
                        )}
                      </td>
                      {Array.from(allAssignmentNames).map((assignmentName) => {
                        const assignment = course.assignments.find(a => a.name === assignmentName);
                        const isHighlightedAssignment = 
                          isHighlighted && 
                          highlightComponent &&
                          assignment?.name === highlightComponent;
                        
                        return (
                          <td
                            key={assignmentName}
                            className={`px-6 py-4 whitespace-nowrap text-center ${
                              isHighlightedAssignment ? 'bg-indigo-100' : ''
                            }`}
                          >
                            {assignment ? (
                              <div>
                                <span className="text-sm font-medium text-gray-900">
                                  {assignment.score}
                                </span>
                                <div className="text-xs text-gray-500 mt-1">{assignment.date}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">—</span>
                            )}
                          </td>
                        );
                      })}
                      {hasMidterm && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {course.midterm ? (
                            <div>
                              <span className="text-sm font-medium text-blue-600">
                                {course.midterm.score}
                              </span>
                              <div className="text-xs text-gray-500 mt-1">{course.midterm.date}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                      )}
                      {hasFinal && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {course.final ? (
                            <div>
                              <span className="text-sm font-medium text-green-600">
                                {course.final.score}
                              </span>
                              <div className="text-xs text-gray-500 mt-1">{course.final.date}</div>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderModuleList = () => {
    if (!teacherSelectedClassId || teacherClassModules.length === 0) {
      return (
        <div className="text-center text-gray-500 py-10 border border-dashed border-gray-300 rounded-lg">
          {!teacherSelectedClassId 
            ? 'Vui lòng chọn lớp để hiển thị danh sách module.'
            : 'Không có module nào trong lớp này.'}
        </div>
      );
    }

    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex flex-col gap-1">
          <h3 className="text-lg font-semibold text-gray-900">Danh sách module đã giao</h3>
          <p className="text-sm text-gray-600">
            Bấm vào từng module để xem lịch sử nhập điểm (theo các mức 2 và 3).
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MODULE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  NGÀY NHẬP GẦN NHẤT
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {teacherClassModules.map((module) => (
                <tr
                  key={module.id}
                  onClick={() => {
                    setSelectedModuleForDetail(module);
                    setSelectedEntryGroup(null);
                    setViewLevel('moduleEntries');
                    if (isAddMode) {
                      setTeacherSelectedModuleId(module.id);
                    }
                  }}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <div className="flex flex-col">
                      <span>{module.moduleName || `Module ${module.moduleId}`}</span>
                      <span className="text-xs text-gray-500">
                        {module.className || `Lớp ${module.classId}`}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {moduleStatsLoading[module.id]
                      ? '—'
                      : moduleEntryStats[module.id]?.latestEntryDate
                        ? formatEntryDate(moduleEntryStats[module.id]?.latestEntryDate) ?? '—'
                        : 'Chưa nhập'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderModuleDetail = () => {
    if (!selectedModuleForDetail) {
      return (
        <div className="text-center text-gray-500 py-10 border border-dashed border-gray-300 rounded-lg">
          Không có thông tin module.
        </div>
      );
    }

    const moduleStats = moduleEntryStats[selectedModuleForDetail.id];
    const entryGroups = moduleEntryGroupsMap[selectedModuleForDetail.id] ?? [];
    const isSummaryLoading =
      moduleStatsLoading[selectedModuleForDetail.id] || moduleGroupLoading[selectedModuleForDetail.id];
    const teacherNames =
      selectedModuleForDetail.teachers && selectedModuleForDetail.teachers.length > 0
        ? selectedModuleForDetail.teachers.map((t) => t.userName || t.userEmail || '—').join(', ')
        : 'Chưa phân công';

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => {
            setViewLevel('modules');
            setSelectedModuleForDetail(null);
            setSelectedEntryGroup(null);
            setTeacherSelectedModuleId(null);
          }}
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
          <span aria-hidden="true">← </span> 
          Quay lại danh sách
        </button>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-xs text-gray-500 mb-1">NGÀY TẠO MODULE</div>
            <div className="text-sm font-medium text-gray-900">
              {selectedModuleForDetail.createdAt ? formatEntryDate(selectedModuleForDetail.createdAt) : '—'}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-xs text-gray-500 mb-1">GIÁO VIÊN</div>
            <div className="text-sm font-medium text-gray-900">
              {teacherNames}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-xs text-gray-500 mb-1">NGÀY NHẬP GẦN NHẤT</div>
            <div className="text-sm font-medium text-gray-900">
              {moduleStats?.latestEntryDate ? formatEntryDate(moduleStats.latestEntryDate) : 'Chưa nhập'}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-xs text-gray-500 mb-1">SỐ HỌC VIÊN</div>
            <div className="text-sm font-medium text-gray-900">
              {moduleStats?.studentsWithScores ?? 0}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Thông tin Module</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Module:</span>{' '}
                <span className="font-medium text-gray-900">
                  {selectedModuleForDetail.moduleName || `Module ${selectedModuleForDetail.moduleId}`}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Lớp học:</span>{' '}
                <span className="font-medium text-gray-900">
                  {selectedModuleForDetail.className || `Lớp ${selectedModuleForDetail.classId}`}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Danh sách các lần nhập/chỉnh sửa điểm</h3>
              <p className="text-sm text-gray-500">
                Bấm vào từng dòng để xem chi tiết học viên và điểm từng đợt.
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Tổng số đợt: <span className="font-semibold text-gray-900">{moduleStats?.totalEntries ?? 0}</span>
            </div>
          </div>
          {isSummaryLoading ? (
            <TableSkeleton />
          ) : entryGroups.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NGÀY NHẬP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NGƯỜI NHẬP
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NGÀY TẠO
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SỐ HỌC VIÊN
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {entryGroups.map((group) => (
                    <tr
                      key={`${group.moduleId}-${group.entryDate}`}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedEntryGroup(group);
                        setViewLevel('entryDetail');
                      }}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatEntryDate(group.entryDate) || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {group.enteredBy || teacherNames}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {group.createdAt ? formatDateTime(group.createdAt) : formatDateTime(group.entryDate) || formatEntryDate(group.entryDate) || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-gray-900">
                        {group.studentCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-10">
              Module này chưa có lượt nhập điểm nào.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEntryDetail = () => {
    if (!selectedModuleForDetail || !selectedEntryGroup) {
      return (
        <div className="text-center text-gray-500 py-10 border border-dashed border-gray-300 rounded-lg">
          Không tìm thấy dữ liệu đợt nhập điểm.
        </div>
      );
    }

    const teacherNames =
      selectedModuleForDetail.teachers && selectedModuleForDetail.teachers.length > 0
        ? selectedModuleForDetail.teachers.map((t) => t.userName || t.userEmail || '—').join(', ')
        : 'Chưa phân công';

    return (
      <div className="space-y-6">
        <button
          type="button"
          onClick={() => {
            setViewLevel('moduleEntries');
            setSelectedEntryGroup(null);
          }}
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
        >
          <span aria-hidden="true">← </span> 
           Quay lại danh sách đợt
        </button>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-xs text-gray-500 mb-1">ĐỢT</div>
            <div className="text-sm font-medium text-gray-900">
              {formatEntryDate(selectedEntryGroup.entryDate) || '—'}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-xs text-gray-500 mb-1">SỐ HỌC VIÊN</div>
            <div className="text-sm font-medium text-gray-900">{selectedEntryGroup.studentCount}</div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-xs text-gray-500 mb-1">NGƯỜI NHẬP</div>
            <div className="text-sm font-medium text-gray-900">
              {selectedEntryGroup.enteredBy || teacherNames}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="text-xs text-gray-500 mb-1">NGÀY TẠO</div>
            <div className="text-sm font-medium text-gray-900">
              {selectedEntryGroup.createdAt
                ? formatDateTime(selectedEntryGroup.createdAt)
                : formatDateTime(selectedEntryGroup.entryDate) || '—'}
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-600">
          {selectedModuleForDetail.moduleName || `Module ${selectedModuleForDetail.moduleId}`} •{' '}
          {selectedModuleForDetail.className || `Lớp ${selectedModuleForDetail.classId}`}
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Chi tiết đợt nhập</h3>
            </div>
          </div>
          {selectedEntryGroup.students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      TÊN HỌC VIÊN
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ĐIỂM LÝ THUYẾT
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ĐIỂM THỰC HÀNH
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedEntryGroup.students.map((student) => {
                    return (
                      <tr key={student.studentId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.studentName}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          {student.theoryScore !== undefined && student.theoryScore !== null
                            ? formatScore(student.theoryScore as number | string)
                            : '—'}
                        </td>
                        <td className="px-6 py-4 text-center text-sm text-gray-900">
                          {student.practiceScore !== undefined && student.practiceScore !== null
                            ? formatScore(student.practiceScore as number | string)
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-gray-500 py-10">
              Không có học viên trong đợt này.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTeacherContent = () => {
    if (teacherClasses.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center text-gray-600">
          Bạn chưa được phân công giảng dạy lớp nào. Vui lòng liên hệ quản trị viên để được cấp quyền.
        </div>
      );
    }

    if (viewLevel === 'entryDetail') {
      return renderEntryDetail();
    }
    if (viewLevel === 'moduleEntries') {
      return renderModuleDetail();
    }

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex flex-col gap-4">
            <div className="flex gap-2">
              {!isAddMode ? (
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMode(true);
                    setViewLevel('modules');
                    setTeacherSelectedClassId(null);
                    setTeacherClassModules([]);
                    setTeacherSelectedModuleId(null);
                    setTeacherStartDate('');
                    setTeacherEndDate('');
                    setTeacherGradebook(null);
                    setSelectedModuleForDetail(null);
                    setSelectedEntryGroup(null);
                    setEditingScores({});
                    setEditingEntryDates({});
                    setHasUnsavedChanges(false);
                  }}
                  disabled={teacherEntryLoading}
                  className={`inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium ${
                    teacherEntryLoading
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  + Thêm điểm mới
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (hasUnsavedChanges) {
                      if (!confirm('Bạn có thay đổi chưa lưu. Bạn có chắc muốn thoát?')) {
                        return;
                      }
                    }
                    setIsAddMode(false);
                    setViewLevel('modules');
                    setEditingScores({});
                    setEditingEntryDates({});
                    setHasUnsavedChanges(false);
                  }}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                >
                  Hiển thị danh sách
                </button>
              )}
            </div>
              <div className={`grid grid-cols-1 gap-4 ${isAddMode ? 'md:grid-cols-4' : 'md:grid-cols-1'}`}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chọn lớp</label>
                <select
                  value={teacherSelectedClassId ?? ''}
                  onChange={(event) => {
                    const value = event.target.value;
                    setTeacherSelectedClassId(value ? Number(value) : null);
                    setViewLevel('modules');
                    setSelectedModuleForDetail(null);
                    setSelectedEntryGroup(null);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Chọn lớp</option>
                  {teacherClasses.map((cls) => (
                    <option key={cls.classId} value={cls.classId}>
                      {cls.className || `Lớp ${cls.classId}`}
                    </option>
                  ))}
                </select>
              </div>
              {isAddMode && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Module</label>
                    <select
                      key={`module-${teacherSelectedClassId}`}
                      value={teacherSelectedModuleId ?? ''}
                      onChange={(event) => {
                        const value = event.target.value;
                        setTeacherSelectedModuleId(value ? Number(value) : null);
                      }}
                      disabled={teacherClassModules.length === 0}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100"
                    >
                      <option value="">Chọn module</option>
                      {teacherClassModules.map((module) => (
                        <option key={module.id} value={module.id}>
                          {module.moduleName || `Module ${module.moduleId}`}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/*
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngày bắt đầu</label>
                    <input
                      type="date"
                      value={teacherStartDate}
                      onChange={(event) => setTeacherStartDate(event.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Ngày kết thúc</label>
                    <input
                      type="date"
                      value={teacherEndDate}
                      onChange={(event) => setTeacherEndDate(event.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  */}
                </>
              )}
            </div>
          </div>
        </div>

        {!isAddMode ? (
          renderModuleList()
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            <p className="text-xs text-gray-500">
              Mọi thao tác chỉnh sửa/nhập mới sẽ ghi nhận người chỉnh sửa là{' '}
              <span className="font-semibold text-gray-700">{teacherEditorDisplayName}</span>.
            </p>

            {!teacherSelectedClassId || !teacherSelectedModuleId ? (
              <div className="text-center text-gray-500 py-10 border border-dashed border-gray-300 rounded-lg">
                {!teacherSelectedClassId 
                  ? 'Vui lòng chọn lớp để hiển thị bảng điểm.'
                  : 'Vui lòng chọn module để hiển thị bảng điểm.'}
              </div>
            ) : teacherEntryLoading ? (
            <TableSkeleton />
          ) : teacherGradebook && teacherGradebook.students.length > 0 ? (
            <>
              {hasUnsavedChanges && (
                <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <span className="text-sm text-yellow-800">
                    Bạn có thay đổi chưa lưu. Vui lòng nhấn "Lưu tất cả" để lưu các thay đổi.
                  </span>
                  <button
                    type="button"
                    onClick={handleBatchSaveGrades}
                    disabled={teacherSavingScore}
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {teacherSavingScore ? 'Đang lưu...' : 'Lưu tất cả'}
                  </button>
                </div>
              )}
              <div className="space-y-3">
                {teacherUsingFallbackColumns && (
                  <div className="px-4 py-3 bg-amber-50 text-amber-700 rounded-md text-sm">
                    Module này chưa có cấu hình thành phần điểm. Tạm hiển thị &quot;Điểm lý thuyết&quot; và &quot;Điểm thực hành&quot; để bạn nhập nhanh.
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                          Tên học viên
                        </th>
                        {teacherComponentColumns.map((component) => (
                          <th
                            key={component}
                            className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]"
                          >
                            {component}
                          </th>
                        ))}
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                          Ngày nhập điểm
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {teacherGradebook.students
                        .filter((student) => {
                          const startDateParam = teacherStartDate?.trim();
                          const endDateParam = teacherEndDate?.trim();
                          if (startDateParam && endDateParam) {
                            if (!student.entryDate) {
                              return false;
                            }
                            const entryDate = new Date(student.entryDate);
                            const startDate = new Date(startDateParam);
                            const endDate = new Date(endDateParam);
                            
                            startDate.setHours(0, 0, 0, 0);
                            endDate.setHours(23, 59, 59, 999);
                            entryDate.setHours(0, 0, 0, 0);
                            
                            if (entryDate < startDate || entryDate > endDate) {
                              return false;
                            }
                          }
                          
                          if (isAddMode) {
                            return true;
                          }
                          const theoryField = componentNameToField('Điểm lý thuyết');
                          const practiceField = componentNameToField('Điểm thực hành');
                          const theoryScore = theoryField ? student[theoryField] : undefined;
                          const practiceScore = practiceField ? student[practiceField] : undefined;
                          return (theoryScore !== undefined && theoryScore !== null) || 
                                 (practiceScore !== undefined && practiceScore !== null);
                        })
                        .map((student) => {
                          const editingEntryDate = editingEntryDates[student.studentId];
                          const displayEntryDate = editingEntryDate || 
                            (student.entryDate ? new Date(student.entryDate).toISOString().slice(0, 10) : todayString());
                          
                          return (
                            <tr key={student.studentId} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap sticky left-0 bg-white z-10">
                                <div className="text-sm font-medium text-gray-900">{student.studentName}</div>
                              </td>
                              {teacherComponentColumns.map((component) => {
                                const field = componentNameToField(component);
                                const score = field ? student[field] : undefined;
                                const isTheory = component === 'Điểm lý thuyết';
                                const isPractice = component === 'Điểm thực hành';
                                const canEdit = isAddMode && (isTheory || isPractice);
                                
                                const editKey = `${student.studentId}_${component}`;
                                const editingValue = editingScores[editKey];
                                const displayValue = editingValue !== undefined 
                                  ? editingValue 
                                  : (score !== undefined && score !== null ? String(score) : '');
                                
                                return (
                                  <td 
                                    key={component} 
                                    className={`px-6 py-4 text-center ${canEdit ? 'p-0' : ''}`}
                                  >
                                    {canEdit ? (
                                      <input
                                        type="number"
                                        min="0"
                                        max="10"
                                        step="0.1"
                                        value={displayValue}
                                        onChange={(e) => {
                                          const value = e.target.value;
                                          if (value === '' || value === '-') {
                                            setEditingScores(prev => ({
                                              ...prev,
                                              [editKey]: value,
                                            }));
                                            setHasUnsavedChanges(true);
                                            return;
                                          }
                                          const numValue = parseFloat(value);
                                          if (isNaN(numValue)) {
                                            return;
                                          }
                                          let finalValue = value;
                                          if (numValue < 0) {
                                            finalValue = '0';
                                          } else if (numValue > 10) {
                                            finalValue = '10';
                                          }
                                          setEditingScores(prev => ({
                                            ...prev,
                                            [editKey]: finalValue,
                                          }));
                                          setHasUnsavedChanges(true);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            handleBatchSaveGrades();
                                          }
                                        }}
                                        className="w-full px-3 py-2 text-center text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        placeholder="-"
                                      />
                                    ) : (
                                      <span className="text-sm text-gray-900">
                                        {score !== undefined && score !== null ? formatScore(score as number | string) : '—'}
                                      </span>
                                    )}
                                  </td>
                                );
                              })}
                              <td className="px-6 py-4 text-center">
                                {isAddMode ? (
                                  <input
                                    type="date"
                                    value={displayEntryDate}
                                    onChange={(e) => {
                                      setEditingEntryDates(prev => ({
                                        ...prev,
                                        [student.studentId]: e.target.value,
                                      }));
                                      setHasUnsavedChanges(true);
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleBatchSaveGrades();
                                      }
                                    }}
                                    className="px-3 py-2 text-center text-sm border border-indigo-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                  />
                                ) : (
                                  <span className="text-sm text-gray-900">{getStudentEntryDateLabel(student)}</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {teacherGradebook.totalPages > 1 && (
                <div className="border-t pt-4">
                  <Pagination
                    currentPage={teacherCurrentPage}
                    totalPages={teacherGradebook.totalPages}
                    totalElements={teacherGradebook.totalElements}
                    pageSize={TEACHER_PAGE_SIZE}
                    onPageChange={setTeacherCurrentPage}
                      itemName="học viên"
                  />
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500 py-6 border border-dashed border-gray-300 rounded-lg">
              {teacherStartDate && teacherEndDate 
                ? `Không có bản ghi điểm nào cho khoảng ngày ${formatFilterDateLabel()}.`
                : 'Không có bản ghi điểm nào cho lớp và module đã chọn.'}
            </div>
          )}
          </div>
        )}

        {isAddMode && (
          <GradeEntryModal
            isOpen={teacherGradeModal.isOpen}
            onClose={() =>
              setTeacherGradeModal({
                isOpen: false,
                studentId: null,
                studentName: '',
                entryDate: todayString(),
              })
            }
            onSave={handleSaveGrade}
            studentId={teacherGradeModal.studentId}
            studentName={teacherGradeModal.studentName || 'Chọn học viên'}
            students={
              teacherGradebook?.students.map((s) => ({
                studentId: s.studentId,
                studentName: s.studentName,
              })) || []
            }
            currentTheoryScore={teacherGradeModal.currentTheoryScore}
            currentPracticeScore={teacherGradeModal.currentPracticeScore}
            isSaving={teacherSavingScore}
            initialEntryDate={teacherGradeModal.entryDate || todayString()}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="mt-4 text-gray-600">Đang tải điểm số...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="text-red-600 mr-3">⚠️</div>
              <div>
                <h5 className="font-medium text-red-800">Lỗi</h5>
                <p className="text-sm text-red-700 mt-1">{error}</p>
                <button
                  onClick={fetchScores}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                >
                  Thử lại
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <NotificationPopup notification={notification} onClose={hideNotification} />

        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Điểm số</h1>
          <p className="text-gray-600">
            {isTeacher
              ? 'Theo dõi và cập nhật điểm số cho các lớp học bạn phụ trách.'
              : 'Theo dõi kết quả học tập và điểm số của bạn trong các khóa học.'}
          </p>
        </div>


        {isTeacher ? renderTeacherContent() : renderStudentContent()}
      </div>
    </div>
  );
}


