import React, { Fragment, useState, useEffect, useMemo } from 'react';
import { PlusIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { getAllClassesAsArray } from '../../services/classApi';
import { moduleApi } from '../../services/moduleApi';
import { 
  createSchedule, 
  getSchedulesByClass, 
  type ClassModuleScheduleDTO,
  type CreateScheduleRequest 
} from '../../services/scheduleApi';
import { getSessionById } from '../../services/moduleSessionApi';
import { api } from '../../services/api';
import type { ClassInfo } from '../../types/class';
import type { Module } from '../../types/module';
import AssignTeacherModal from '../../components/AssignTeacherModal';
import TableSkeleton from '../../components/TableSkeleton';
import AdminPageHeader from '../../components/AdminPageHeader';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { parseBackendDate } from '../../utils/timeFormat';

export default function ScheduleManagementPage() {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [schedules, setSchedules] = useState<ClassModuleScheduleDTO[]>([]);
  const [sessionContents, setSessionContents] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<ClassModuleScheduleDTO | null>(null);
  const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sttOrder = useMemo(() => {
    return [...schedules.map(s => s.id)].sort((a, b) => a - b);
  }, [schedules]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classesData, modulesData] = await Promise.all([
        getAllClassesAsArray(),
        moduleApi.getAllModulesAsArray()
      ]);
      setClasses(classesData);
      setModules(modulesData);
      
      const allSchedules: ClassModuleScheduleDTO[] = [];
      for (const classItem of classesData) {
        try {
          const classSchedules = await getSchedulesByClass(classItem.id);
          allSchedules.push(...classSchedules);
        } catch (err) {
          console.warn(`Failed to load schedules for class ${classItem.id}:`, err);
        }
      }
      setSchedules(allSchedules.sort((a,b)=>a.id-b.id));
      try {
        const sessionIds = Array.from(new Set(allSchedules.map(s => s.moduleSessionId).filter((id): id is number => typeof id === 'number')));
        if (sessionIds.length > 0) {
          const entries = await Promise.all(sessionIds.map(async (id) => {
            try {
              const sess = await getSessionById(id);
              return [id, sess.content || ''] as [number, string];
            } catch (err) {
              return [id, ''];
            }
          }));
          const map = Object.fromEntries(entries) as Record<number, string>;
          setSessionContents(map);
        } else {
          setSessionContents({});
        }
      } catch (err) {
        console.warn('Failed to preload session contents', err);
        setSessionContents({});
      }
      setError(null);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (data: CreateScheduleRequest) => {
    try {
      await createSchedule(data);
      setShowCreateModal(false);
      fetchData();
    } catch (error: any) {
      console.error('Error creating schedule:', error);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Quản lý Lịch học</h1>
          <div className="h-10 w-40 bg-gray-200 rounded-lg animate-pulse"></div>
        </div>
        <TableSkeleton rows={5} columns={9} />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: 'Quản trị', onClick: () => navigate('/admin') },
          { label: 'Lịch học', onClick: () => navigate('/admin/schedules'), active: true },
        ]}
        title="Quản lý Lịch học"
        chips={[
          { label: 'Tổng lịch', value: schedules.length ?? 0, tone: 'indigo' },
          { label: 'Lớp', value: classes.length ?? 0 },
          { label: 'Module', value: modules.length ?? 0 },
        ]}
        rightSlot={(
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Tạo lịch học mới
          </button>
        )}
      />

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
                <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">STT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lớp học</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Module</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nội dung</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Giảng viên chính</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày bắt đầu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày kết thúc</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-gray-500">
                    Chưa có lịch học nào
                  </td>
                </tr>
              ) : (
                schedules.map((schedule) => {
                  const classItem = classes.find(c => c.id === schedule.classId);
                  const module = modules.find(m => m.id === schedule.moduleId);
                  
                  return (
                    <tr key={schedule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sttOrder.indexOf(schedule.id) + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{schedule.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {schedule.className || classItem?.className || schedule.classId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {schedule.moduleName || module?.name || schedule.moduleId}
                      </td>
                      <td className="px-6 py-4 max-w-xl text-sm text-gray-700">
                        <div className="max-w-xl truncate" title={schedule.moduleSessionId != null ? (sessionContents[Number(schedule.moduleSessionId)] || '-') : '-'}>
                          {schedule.moduleSessionId != null ? (sessionContents[Number(schedule.moduleSessionId)] || '-') : '-'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {schedule.instructorName || (schedule.instructorId ? `ID: ${schedule.instructorId}` : '-')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {/* {schedule.startDate ? parseBackendDate(schedule.startDate)?.toLocaleDateString('vi-VN') || '-' : '-'} */}
                        {schedule.startDate ? (Array.isArray(schedule.startDate) ? new Date(schedule.startDate[0], schedule.startDate[1] - 1, schedule.startDate[2]) : new Date(schedule.startDate as string)).toLocaleDateString('vi-VN') || '-' : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {schedule.endDate ? parseBackendDate(schedule.endDate)?.toLocaleDateString('vi-VN') || '-' : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          schedule.status === 'completed' 
                            ? 'bg-green-100 text-green-800'
                            : schedule.status === 'ongoing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {schedule.status === 'completed' ? 'Hoàn thành' : 
                           schedule.status === 'ongoing' ? 'Đang diễn ra' : 'Dự kiến'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedSchedule(schedule);
                            setShowAssignTeacherModal(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900 p-1"
                          title="Gán giáo viên"
                        >
                          <UserGroupIcon className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <CreateScheduleModal
          classes={classes}
          modules={modules}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreate}
        />
      )}

      {showAssignTeacherModal && selectedSchedule && (
        <AssignTeacherModal
          scheduleId={selectedSchedule.id}
          onClose={() => {
            setShowAssignTeacherModal(false);
            setSelectedSchedule(null);
          }}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}

interface CreateScheduleModalProps {
  classes: ClassInfo[];
  modules: Module[];
  onClose: () => void;
  onSave: (data: CreateScheduleRequest) => Promise<void>;
}

export function CreateScheduleModal({ classes, modules, onClose, onSave }: CreateScheduleModalProps) {
  const [formData, setFormData] = useState({
    classId: '',
    moduleId: '',
    instructorId: '',
    startDate: '',
    endDate: '',
  });
  const [users, setUsers] = useState<Array<{ id: number; username: string; email: string; firstName?: string; lastName?: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get('/users').then((data: any) => {
      setUsers(Array.isArray(data) ? data : []);
    }).catch(() => {
      setUsers([]);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.classId || !formData.moduleId || !formData.startDate || !formData.endDate) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError('Ngày kết thúc phải sau ngày bắt đầu');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      await onSave({
        classId: Number(formData.classId),
        moduleId: Number(formData.moduleId),
        instructorId: formData.instructorId ? Number(formData.instructorId) : undefined,
        startDate: formData.startDate,
        endDate: formData.endDate,
      });
    } catch (err: any) {
      setError(err.message || 'Không thể tạo lịch học');
    } finally {
      setIsLoading(false);
    }
  };

  return (
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
          <div className="fixed inset-0 bg-black/40" />
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
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all max-h-[90vh] overflow-y-auto">
                <DialogTitle as="h2" className="text-xl font-bold mb-4">Tạo lịch học mới</DialogTitle>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Lớp học *</label>
            <select
              value={formData.classId}
              onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value=""> Chọn lớp học </option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.className}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Module *</label>
            <select
              value={formData.moduleId}
              onChange={(e) => setFormData({ ...formData, moduleId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value=""> Chọn Module </option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Giảng viên chính</label>
            <select
              value={formData.instructorId}
              onChange={(e) => setFormData({ ...formData, instructorId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value=""> Chọn giảng viên (tùy chọn) </option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.username} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày bắt đầu *</label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày kết thúc *</label>
            <input
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isLoading}
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? 'Đang tạo...' : 'Tạo'}
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
}

