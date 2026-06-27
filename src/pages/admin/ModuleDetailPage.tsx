import { Fragment, useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { useAdminHeader } from "../../components/admin/layout/AdminShell";
import {
  getClassModule,
  getClassInfo,
  type ClassModuleDTO
} from '../../services/classApi';
import {
  getSchedulesByClass,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  type ClassModuleScheduleDTO,
  type CreateScheduleRequest
} from '../../services/scheduleApi';
import { api } from '../../services/api';
import TableSkeleton from '../../components/TableSkeleton';
import NotificationPopup from '../../components/NotificationPopup';
import { useNotification } from '../../hooks/useNotification';
import { getSessionsByModule, getSessionById } from '../../services/moduleSessionApi';
import type { ClassInfo } from '../../types/class';
import { parseBackendDate } from '../../utils/timeFormat';
import ClassDetailTabs, { type ClassTabKey } from './components/ClassDetailTabs';

export default function ModuleDetailPage() {
  const { classId, moduleId } = useParams<{ classId: string; moduleId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { updateHeader, resetHeader } = useAdminHeader();
  const [defaultInstructorId, setDefaultInstructorId] = useState<number | undefined>(undefined);
  const [showCreateScheduleModal, setShowCreateScheduleModal] = useState(false);
  const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ClassModuleScheduleDTO | null>(null);
  const [deleteScheduleTarget, setDeleteScheduleTarget] = useState<ClassModuleScheduleDTO | null>(null);
  const [deleteScheduleLoading, setDeleteScheduleLoading] = useState(false);
  const { notification, showSuccess, hideNotification, showWarning, showApiError } = useNotification();

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'module-detail', classId, moduleId],
    enabled: Boolean(classId && moduleId),
    queryFn: async () => {
      const [moduleData, schedulesData, classInfo, users] = await Promise.all([
        getClassModule(Number(classId), Number(moduleId)),
        getSchedulesByClass(Number(classId)).catch(() => []),
        getClassInfo(Number(classId)).catch(() => null as any),
        api.get<any>('/users').catch(() => []),
      ]);

      const filteredSchedules = schedulesData.filter((s) => {
        if (s.classModuleId && Number(s.classModuleId) === Number(moduleData.id)) return true;
        if (
          !s.classModuleId &&
          Number(s.classId) === Number(moduleData.classId) &&
          Number(s.moduleId) === Number(moduleData.moduleId)
        )
          return true;
        return false;
      });

      let enrichedSchedules = filteredSchedules;
      const uniqueSessionIds = Array.from(
        new Set(filteredSchedules.map((s) => s.moduleSessionId).filter((x) => !!x))
      ) as number[];
      if (uniqueSessionIds.length > 0) {
        const pairs = await Promise.all(
          uniqueSessionIds.map(async (sid) => {
            try {
              const ses = await getSessionById(sid);
              return [sid, { title: ses.title, content: ses.content || '' }] as const;
            } catch {
              return [sid, { title: undefined, content: '' }] as const;
            }
          })
        );
        const infoMap = new Map<number, { title?: string; content?: string }>(pairs as any);
        enrichedSchedules = filteredSchedules.map((s) => ({
          ...s,
          moduleSessionTitle: s.moduleSessionId
            ? infoMap.get(Number(s.moduleSessionId))?.title
            : undefined,
          moduleSessionContent: s.moduleSessionId
            ? infoMap.get(Number(s.moduleSessionId))?.content
            : undefined,
        })) as any[];
      }

      const normalizedUsers = Array.isArray(users)
        ? users
        : users?.content && Array.isArray(users.content)
          ? users.content
          : users?.items && Array.isArray(users.items)
            ? users.items
            : [];

      return {
        classModule: moduleData,
        schedules: enrichedSchedules,
        classInfo: classInfo as ClassInfo | null,
        users: normalizedUsers,
      };
    },
    staleTime: 30_000,
  });

  const classModule = data?.classModule ?? null;
  const schedules = data?.schedules ?? [];
  const classInfoState = data?.classInfo ?? null;
  const allUsers = data?.users ?? [];
  const loadingState = isLoading && !data;

  const moduleTitle = classModule
    ? classModule.moduleName || `Module ${classModule.moduleId}`
    : "Chi tiết module";

  const tabFromQuery = (() => {
    const params = new URLSearchParams(location.search);
    const value = params.get('tab');
    const allowed: ClassTabKey[] = ['modules', 'students', 'grades', 'tuition', 'jobs', 'attendance'];
    if (value && allowed.includes(value as ClassTabKey)) {
      return value as ClassTabKey;
    }
    return 'modules';
  })();

  const handleSelectTab = (tab: ClassTabKey) => {
    if (!classId) return;
    const params = new URLSearchParams();
    params.set('tab', tab);
    navigate({ pathname: `/admin/classes/${classId}`, search: params.toString() });
  };

  useEffect(() => {
    if (!classId || !moduleId || !classModule) return;

    updateHeader({
      title: moduleTitle,
      breadcrumbs: [
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Lớp học", href: "/admin/classes" },
        {
          label: classInfoState?.className || `Class #${classId}`,
          href: `/admin/classes/${classId}`,
        },
        { label: moduleTitle },
      ],
    });

    return () => resetHeader();
  }, [
    classId,
    classInfoState?.className,
    classModule,
    moduleId,
    moduleTitle,
    resetHeader,
    updateHeader,
  ]);

  useEffect(() => {
    if (!defaultInstructorId && classInfoState && Array.isArray(classInfoState.members)) {
      const teacher = classInfoState.members.find(
        (m: any) =>
          (m.role || '').toLowerCase().includes('giao_vien') ||
          (m.role || '').toLowerCase().includes('teacher')
      );
      if (teacher?.userId) setDefaultInstructorId(Number(teacher.userId));
    }
  }, [classInfoState, defaultInstructorId]);

  const stats = useMemo(() => {
    const total = schedules.length;
    const completed = schedules.filter((s) => (s.status || '').toLowerCase() === 'completed').length;
    const ongoing = schedules.filter((s) => (s.status || '').toLowerCase() === 'ongoing').length;
    const upcoming = schedules.filter((s) => (s.status || '').toLowerCase() !== 'completed' && (s.status || '').toLowerCase() !== 'ongoing').length;
    return { total, completed, ongoing, upcoming };
  }, [schedules]);

  const handleCreateSchedule = async (data: CreateScheduleRequest) => {
    if (!classId || !classModule) return;

    try {
      await createSchedule({
        ...data,
        classId: Number(classId),
        moduleId: classModule.moduleId,
        classModuleId: classModule.id,
        instructorId: data.instructorId ?? defaultInstructorId
      });
      setShowCreateScheduleModal(false);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'module-detail', classId, moduleId] });
      showSuccess('Tạo lịch học thành công', 'Lịch học đã được thêm.');
    } catch (error: any) {
      showApiError(error, 'Không thể tạo lịch học', 'Lỗi tạo lịch học');
    }
  };

  const handleUpdateSchedule = async (scheduleId: number, data: Partial<CreateScheduleRequest>) => {
    try {
      await updateSchedule(scheduleId, data);
      setShowEditScheduleModal(false);
      setSelectedSchedule(null);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'module-detail', classId, moduleId] });
      showSuccess('Cập nhật lịch học thành công');
    } catch (error: any) {
      showApiError(error, 'Không thể cập nhật lịch học', 'Lỗi cập nhật lịch học');
    }
  };

  const handleDeleteSchedule = (schedule: ClassModuleScheduleDTO) => {
    setDeleteScheduleTarget(schedule);
  };

  const confirmDeleteSchedule = async () => {
    if (!deleteScheduleTarget) return;
    setDeleteScheduleLoading(true);
    try {
      await deleteSchedule(deleteScheduleTarget.id);
      await queryClient.invalidateQueries({ queryKey: ['admin', 'module-detail', classId, moduleId] });
      setDeleteScheduleTarget(null);
      showSuccess('Đã xóa lịch học');
    } catch (error: any) {
      showApiError(error, 'Không thể xóa lịch học', 'Lỗi xóa lịch học');
    } finally {
      setDeleteScheduleLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 rounded-lg bg-slate-200 animate-pulse" />
        <div className="h-10 w-80 rounded-lg bg-slate-200 animate-pulse" />
        <TableSkeleton rows={5} columns={3} />
      </div>
    );
  }

  if (error || !classModule) {
    const errMsg = error instanceof Error ? error.message : error || 'Không tìm thấy module';
    return (
      <div>
        <button
          onClick={() => navigate(`/admin/classes/${classId}`)}
          className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Quay lại
        </button>
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {errMsg}
        </div>
      </div>
    );
  }

  const renderStatusBadge = (status?: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed') return <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Hoàn thành</span>;
    if (s === 'ongoing') return <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">Đang diễn ra</span>;
    return <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Dự kiến</span>;
  };

  const StatCard = ({ label, value, tone }: { label: string; value: number; tone: 'slate' | 'blue' | 'amber' | 'emerald' }) => {
    const toneMap = {
      slate: 'bg-slate-50 text-slate-800 border-slate-200',
      blue: 'bg-blue-50 text-blue-800 border-blue-200',
      amber: 'bg-amber-50 text-amber-800 border-amber-200',
      emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    };
    const toneClass = toneMap[tone] || toneMap.slate;
    return (
      <div className={`rounded-2xl border ${toneClass} p-4 shadow-sm`}>
        <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold">{value}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <ClassDetailTabs activeTab={tabFromQuery} onSelect={handleSelectTab} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => {
            if (!classId) return;
            const params = new URLSearchParams();
            params.set('tab', 'modules');
            navigate({ pathname: `/admin/classes/${classId}`, search: params.toString() });
          }}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-50"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Quay lại lớp
        </button>

        <button
          type="button"
          onClick={() => setShowCreateScheduleModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
        >
          <PlusIcon className="h-5 w-5" />
          Thêm lịch học
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng buổi" value={stats.total} tone="slate" />
        <StatCard label="Đang diễn ra" value={stats.ongoing} tone="blue" />
        <StatCard label="Sắp tới" value={stats.upcoming} tone="amber" />
        <StatCard label="Hoàn thành" value={stats.completed} tone="emerald" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-semibold text-slate-900">Danh sách buổi học</h2>
          <p className="mt-1 text-sm text-slate-600">Các lịch học thuộc module này</p>
        </div>

        {loadingState ? (
          <div className="px-5 py-4">
            <TableSkeleton rows={6} columns={8} />
          </div>
        ) : schedules.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            Chưa có lịch học nào cho module này
          </div>
        ) : (
          <div className="relative overflow-hidden">
            <table className="min-w-full border-separate border-spacing-y-2 px-5 py-4">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="w-14 px-4 py-2 text-center">STT</th>
                  <th className="px-4 py-2">Buổi học</th>
                  <th className="px-4 py-2">Nội dung</th>
                  <th className="px-4 py-2">Bắt đầu</th>
                  <th className="px-4 py-2">Kết thúc</th>
                  <th className="px-4 py-2">Giáo viên</th>
                  <th className="px-4 py-2">Trạng thái</th>
                  <th className="px-4 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule, index) => (
                  <tr
                    key={schedule.id}
                    className="rounded-xl bg-slate-50/60 text-sm text-slate-700 hover:bg-slate-100/80"
                  >
                    <td className="px-4 py-3 text-center text-slate-600">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <span className="line-clamp-2">{(schedule as any).moduleSessionTitle || `Session ${schedule.moduleSessionId ?? ''}`}</span>
                    </td>
                    <td className="max-w-xl px-4 py-3 text-slate-600">
                      {(schedule as any).moduleSessionContent ? (
                        <span className="line-clamp-2 leading-relaxed" title={(schedule as any).moduleSessionContent || ''}>
                          {(schedule as any).moduleSessionContent}
                        </span>
                      ) : (
                        <span className="italic text-slate-400">Chưa có nội dung</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {schedule.startDate
                        ? parseBackendDate(schedule.startDate)?.toLocaleString('vi-VN', { hour12: false }) || '-'
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {schedule.endDate
                        ? parseBackendDate(schedule.endDate)?.toLocaleString('vi-VN', { hour12: false }) || '-'
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {schedule.instructorName || schedule.instructorId
                        ? schedule.instructorName || `User ${schedule.instructorId}`
                        : 'Chưa có giáo viên'}
                    </td>
                    <td className="px-4 py-3">{renderStatusBadge(schedule.status as string)}</td>
                    <td className="rounded-r-xl px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSchedule(schedule);
                            setShowEditScheduleModal(true);
                          }}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
                          title="Chỉnh sửa"
                        >
                          <PencilIcon className="h-4 w-4" />
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSchedule(schedule)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-600 transition-colors hover:bg-rose-50"
                          title="Xóa"
                        >
                          <TrashIcon className="h-4 w-4" />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <NotificationPopup notification={notification} onClose={hideNotification} />

      {deleteScheduleTarget && (
        <ConfirmDeleteScheduleDialog
          schedule={deleteScheduleTarget}
          loading={deleteScheduleLoading}
          onClose={() => {
            if (deleteScheduleLoading) return;
            setDeleteScheduleTarget(null);
          }}
          onConfirm={confirmDeleteSchedule}
        />
      )}

      {showCreateScheduleModal && classModule && (
        <CreateScheduleModal
          onClose={() => setShowCreateScheduleModal(false)}
          onSave={handleCreateSchedule}
          users={Array.isArray(allUsers) ? allUsers : []}
          classModule={classModule}
          defaultInstructorId={defaultInstructorId}
          notify={{ showWarning, showSuccess }}
        />
      )}

      {showEditScheduleModal && selectedSchedule && (
        <EditScheduleModal
          schedule={selectedSchedule}
          onClose={() => {
            setShowEditScheduleModal(false);
            setSelectedSchedule(null);
          }}
          onSave={(data) => handleUpdateSchedule(selectedSchedule.id, data)}
          users={Array.isArray(allUsers) ? allUsers : []}
        />
      )}
    </div>
  );
}

function CreateScheduleModal({
  onClose,
  onSave,
  users,
  classModule,
  defaultInstructorId,
  notify
}: {
  onClose: () => void;
  onSave: (data: CreateScheduleRequest) => void;
  users: any[];
  classModule: ClassModuleDTO;
  defaultInstructorId?: number;
  notify?: { showWarning: (title: string, message?: string) => void; showSuccess?: (title: string, message?: string) => void };
}) {
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    instructorId: '',
    moduleSessionId: ''
  });
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const page = await getSessionsByModule(classModule.moduleId, 0, 50, 'id,asc');
        setTemplates(Array.isArray(page?.content) ? page.content : []);
      } catch {
        setTemplates([]);
      }
    };
    loadTemplates();
  }, [classModule.moduleId]);

  useEffect(() => {
    if (!formData.instructorId && defaultInstructorId && Array.isArray(users)) {
      const exists = users.some((u) => Number(u.id) === Number(defaultInstructorId));
      if (exists) {
        setFormData((prev) => ({ ...prev, instructorId: String(defaultInstructorId) }));
      }
    }
  }, [defaultInstructorId, users]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) {
      notify?.showWarning?.('Thiếu thông tin', 'Vui lòng nhập đầy đủ ngày bắt đầu và ngày kết thúc');
      return;
    }
    onSave({
      classId: classModule.classId,
      moduleId: classModule.moduleId,
      classModuleId: classModule.id,
      startDate: formData.startDate,
      endDate: formData.endDate,
      instructorId: formData.instructorId ? Number(formData.instructorId) : undefined,
      moduleSessionId: formData.moduleSessionId ? Number(formData.moduleSessionId) : undefined
    });
  };

  const content = (
    <Transition appear show as={Fragment}>
      <Dialog as="div" className="relative z-[1000]" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200 transition-opacity"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150 transition-opacity"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200 transition-all"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150 transition-all"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="mb-4 flex items-center justify-between">
                  <DialogTitle as="h2" className="text-lg font-semibold text-slate-900">Thêm lịch học</DialogTitle>
                  <button
                    type="button"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-700"
                    onClick={onClose}
                  >
                    Đóng
                  </button>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Template buổi học</label>
            <select
              value={formData.moduleSessionId}
              onChange={(e) => setFormData({ ...formData, moduleSessionId: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Chọn template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title || `Session ${t.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Ngày bắt đầu <span className="text-rose-500">*</span></label>
            <input
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Ngày kết thúc <span className="text-rose-500">*</span></label>
            <input
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Giáo viên</label>
            <select
              value={formData.instructorId}
              onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Chọn giáo viên (tùy chọn)</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username || user.email || `User ${user.id}`}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              Thêm
            </button>
          </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );

  if (typeof document === "undefined") {
    return content;
  }

  return createPortal(content, document.body);
}

function ConfirmDeleteScheduleDialog({
  schedule,
  loading,
  onClose,
  onConfirm,
}: {
  schedule: ClassModuleScheduleDTO;
  loading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const content = (
    <Transition appear show as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[1000]"
        onClose={() => {
          if (!loading) onClose();
        }}
      >
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200 transition-opacity"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150 transition-opacity"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200 transition-all"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150 transition-all"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left align-middle shadow-xl transition-all">
                <DialogTitle as="h2" className="text-lg font-semibold text-slate-900">Xóa lịch học</DialogTitle>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Bạn có chắc muốn xóa lịch học "{(schedule as any).moduleSessionTitle || `Session ${schedule.moduleSessionId ?? ''}`}"?
                  Hành động này không thể hoàn tác.
                </p>
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                    onClick={onClose}
                    disabled={loading}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={onConfirm}
                    disabled={loading}
                  >
                    {loading && (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    )}
                    Xóa
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );

  if (typeof document === "undefined") {
    return content;
  }

  return createPortal(content, document.body);
}

function EditScheduleModal({
  schedule,
  onClose,
  onSave,
  users,
}: {
  schedule: ClassModuleScheduleDTO;
  onClose: () => void;
  onSave: (data: Partial<CreateScheduleRequest>) => void;
  users: any[];
}) {
  const toInputLocal = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    const yyyy = d.getFullYear();
    const MM = pad(d.getMonth() + 1);
    const dd = pad(d.getDate());
    const hh = pad(d.getHours());
    const mm = pad(d.getMinutes());
    return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
  };

  const [formData, setFormData] = useState({
    startDate: toInputLocal(schedule.startDate),
    endDate: toInputLocal(schedule.endDate),
    instructorId: schedule.instructorId ? String(schedule.instructorId) : '',
    status: (schedule.status as any) || 'planned'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.startDate || !formData.endDate) {
      alert('Vui lòng nhập đầy đủ ngày bắt đầu và ngày kết thúc');
      return;
    }
    onSave({
      startDate: formData.startDate,
      endDate: formData.endDate,
      instructorId: formData.instructorId ? Number(formData.instructorId) : undefined,
      // @ts-ignore backend supports status update
      status: formData.status as any
    });
  };

  const content = (
    <Transition appear show as={Fragment}>
      <Dialog as="div" className="relative z-[1000]" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200 transition-opacity"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150 transition-opacity"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200 transition-all"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150 transition-all"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="mb-4 flex items-center justify-between">
                  <DialogTitle as="h2" className="text-lg font-semibold text-slate-900">Chỉnh sửa lịch học</DialogTitle>
                  <button
                    type="button"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-700"
                    onClick={onClose}
                  >
                    Đóng
                  </button>
                </div>
                <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Ngày bắt đầu <span className="text-rose-500">*</span></label>
            <input
              type="datetime-local"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Ngày kết thúc <span className="text-rose-500">*</span></label>
            <input
              type="datetime-local"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Giáo viên</label>
            <select
              value={formData.instructorId}
              onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Chọn giáo viên (tùy chọn)</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.username || user.email || `User ${user.id}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Trạng thái</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="planned">Dự kiến</option>
              <option value="ongoing">Đang diễn ra</option>
              <option value="completed">Hoàn thành</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              Lưu
            </button>
          </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );

  if (typeof document === "undefined") {
    return content;
  }

  return createPortal(content, document.body);
}
