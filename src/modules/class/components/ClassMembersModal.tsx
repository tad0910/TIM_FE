import { Fragment, useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import {
  addMemberToClass,
  removeMemberFromClass,
  getClassInfo
} from '../../../services/classApi';
import { getAllUsers, getUserById, type User } from '../../../services/userApi';
import type { ClassInfo, Member } from '../../../types/class';
import UserAvatar from '../../../components/UserAvatar';
import { useIsAdminSimple } from '../../../utils/useIsAdmin';
import studentFormApi from '../../../services/formApi';
import StudentFormCreatePanel from '../../../components/forms/StudentFormCreatePanel';
import type { FormTemplate, StudentFormResponse, FormStatus } from '../../../types/form';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { fetchStudentEnrollment, type StudentEnrollmentInfo } from '../../../utils/studentEnrollment';
// import { parseBackendDate } from '../../../utils/timeFormat';
import NotificationPopup from '../../../components/NotificationPopup';
import { useNotification } from '../../../hooks/useNotification';

interface ClassMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  classInfo: ClassInfo;
  onSuccess: () => void;
  initialStudentId?: number | null;
}

type ModalView = 'members' | 'forms' | 'create';

const statusBadgeStyles: Record<FormStatus | "DEFAULT", string> = {
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  PROCESSING: "bg-teal-100 text-teal-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  DEFAULT: "bg-gray-100 text-gray-800",
};

const statusLabels: Record<FormStatus | "UNKNOWN", string> = {
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  PROCESSING: "Đang xử lý",
  PENDING: "Chờ duyệt",
  UNKNOWN: "Không rõ",
};

const formatDate = (value?: string | number[] | null) => {
  if (!value) return "";
  try {
    // const parsed = parseBackendDate(value);
    const parsed = Array.isArray(value) ? new Date(value[0], value[1] - 1, value[2]) : new Date(value as string);
    if (!parsed || isNaN(parsed.getTime())) return "";
    return new Intl.DateTimeFormat("vi-VN").format(parsed);
  } catch {
    return String(value);
  }
};

export default function ClassMembersModal({
  isOpen,
  onClose,
  classInfo,
  onSuccess,
  initialStudentId = null,
}: ClassMembersModalProps) {
  const { notification, hideNotification, showSuccess, showApiError } =
    useNotification();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'sinh_vien' | 'giao_vien'>('sinh_vien');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [allUsers, setAllUsers] = useState<Array<{
    id: number;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  }>>([]);
  const [filteredUsers, setFilteredUsers] = useState<Array<{
    id: number;
    username: string;
    email: string;
    firstName?: string;
    lastName?: string;
    profileImage?: string;
  }>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedUserIndex, setSelectedUserIndex] = useState(-1);
  const [isUserSelected, setIsUserSelected] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<Member | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);
  const isAdmin = useIsAdminSimple();

  const handleCloseModal = useCallback(() => {
    setRemoveConfirmOpen(false);
    setRemoveTarget(null);
    onClose();
  }, [onClose]);

  const [currentView, setCurrentView] = useState<ModalView>('members');
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(initialStudentId);
  const [student, setStudent] = useState<User | null>(null);
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [forms, setForms] = useState<StudentFormResponse[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [loadingForms, setLoadingForms] = useState(false);
  const [enrollmentInfo, setEnrollmentInfo] = useState<StudentEnrollmentInfo | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialStudentId) {
        setSelectedStudentId(initialStudentId);
        setCurrentView('forms');
      } else {
        setCurrentView('members');
        setSelectedStudentId(null);
      }
      loadMembers();
      loadUsers();
    } else {
      setCurrentView('members');
      setSelectedStudentId(null);
      setStudent(null);
      setForms([]);
      setEnrollmentInfo(null);
    }
  }, [isOpen, classInfo, initialStudentId]);

  useEffect(() => {
    if (selectedStudentId && currentView !== 'members') {
      getUserById(selectedStudentId)
        .then(user => {
          setStudent(user);
        })
        .catch(err => {
          console.error('Failed to load student info', err);
        });
    }
  }, [selectedStudentId, currentView]);

  useEffect(() => {
    if (currentView === 'forms' || currentView === 'create') {
      const loadData = async () => {
        try {
          setLoadingTemplates(true);
          const templatesData = await studentFormApi.getTemplates();
          setTemplates(templatesData);

          if (selectedStudentId) {
            setLoadingForms(true);
            const allForms = await studentFormApi.getForms();
            const studentForms = allForms.filter(f => f.studentId === selectedStudentId);
            setForms([...studentForms].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)));

            try {
              const enrollment = await fetchStudentEnrollment(selectedStudentId);
              setEnrollmentInfo(enrollment);
            } catch (err) {
              console.error('Failed to load enrollment info', err);
              const programId = (classInfo as any)?.programId ?? classInfo.program?.id ?? undefined;
              const programName = classInfo.program?.name ?? (classInfo as any)?.programName ?? undefined;
              setEnrollmentInfo({
                classId: classInfo.id,
                className: classInfo.className,
                programId,
                programName,
                classDetail: classInfo,
              });
            }
          }
        } catch (err) {
          console.error('Failed to load form data', err);
        } finally {
          setLoadingTemplates(false);
          setLoadingForms(false);
        }
      };
      void loadData();
    }
  }, [currentView, selectedStudentId, classInfo]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      const updatedClassInfo = await getClassInfo(classInfo.id);
      setMembers(updatedClassInfo.members || []);
    } catch (err) {
      console.error('Error loading members:', err);
      setError('Không thể tải danh sách thành viên');
      setMembers(classInfo.members || []);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const page = await getAllUsers(0, 1000, 'id,asc');
      const list = Array.isArray(page?.content) ? page.content : [];
      setAllUsers(list as any);
    } catch (err) {
      console.warn('Error loading users:', err);
      setAllUsers([]);
    }
  };

  useEffect(() => {
    if (isUserSelected) {
      setShowSuggestions(false);
      setFilteredUsers([]);
      return;
    }

    if (newMemberEmail.trim().length >= 2) {
      const searchLower = newMemberEmail.toLowerCase().trim();
      const source = Array.isArray(allUsers) ? allUsers : [];
      const filtered = source.filter((user) => {
        const email = user.email?.toLowerCase() || '';
        const username = user.username?.toLowerCase() || '';
        const firstName = user.firstName?.toLowerCase() || '';
        const lastName = user.lastName?.toLowerCase() || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        return (
          email.includes(searchLower) ||
          username.includes(searchLower) ||
          firstName.includes(searchLower) ||
          lastName.includes(searchLower) ||
          fullName.includes(searchLower)
        );
      }).slice(0, 10);
      
      setFilteredUsers(filtered);
      setShowSuggestions(filtered.length > 0 && showAddForm);
      setSelectedUserIndex(-1);
    } else {
      setFilteredUsers([]);
      setShowSuggestions(false);
    }
  }, [newMemberEmail, allUsers, showAddForm, isUserSelected]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || filteredUsers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedUserIndex((prev) => 
        prev < filteredUsers.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedUserIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && selectedUserIndex >= 0) {
      e.preventDefault();
      handleSelectUser(filteredUsers[selectedUserIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSelectUser = (user: typeof filteredUsers[0]) => {
    setNewMemberEmail(user.email);
    setShowSuggestions(false);
    setSelectedUserIndex(-1);
    setFilteredUsers([]);
    setIsUserSelected(true);
    inputRef.current?.blur();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  useEffect(() => {
    if (!showAddForm) {
      setShowSuggestions(false);
      setFilteredUsers([]);
      setNewMemberEmail('');
      setSelectedUserIndex(-1);
      setIsUserSelected(false);
    }
  }, [showAddForm]);

  const findUserByEmail = async (email: string): Promise<number | null> => {
    try {
      const source = Array.isArray(allUsers) && allUsers.length > 0
        ? allUsers
        : (Array.isArray((await getAllUsers(0, 1000, 'id,asc'))?.content) ? (await getAllUsers(0, 1000, 'id,asc')).content as any : []);

      const foundUser = source.find((u: { email?: string; id: number }) => 
        u.email?.toLowerCase() === email.toLowerCase().trim()
      );
      return foundUser ? foundUser.id : null;
    } catch (err) {
      console.error('Error finding user by email:', err);
      throw new Error('Không thể tìm kiếm người dùng');
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMemberEmail.trim()) {
      setError('Vui lòng nhập email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newMemberEmail.trim())) {
      setError('Email không hợp lệ');
      return;
    }

    try {
      setIsAddingMember(true);
      setError(null);
      setShowSuggestions(false);
      
      const userId = await findUserByEmail(newMemberEmail.trim());
      
      if (!userId) {
        setError('Không tìm thấy người dùng với email này');
        setIsAddingMember(false);
        return;
      }

      await addMemberToClass(classInfo.id, {
        userId,
        role: newMemberRole
      });
      
      const addedUser = allUsers.find(u => u.id === userId);
      
      if (addedUser) {
        const newMember: Member = {
          id: members.length + 1,
          userId: userId,
          role: newMemberRole,
          joinDate: new Date().toISOString(),
          user: {
            id: userId,
            username: addedUser.username,
            email: addedUser.email,
            firstName: addedUser.firstName,
            lastName: addedUser.lastName,
            profileImage: addedUser.profileImage
          }
        };
        setMembers(prev => [...prev, newMember]);
      } else {
        await loadMembers();
      }
      
      setNewMemberEmail('');
      setShowAddForm(false);
      setShowSuggestions(false);
      setFilteredUsers([]);
      setIsUserSelected(false);
      onSuccess();

      showSuccess('Thành công', 'Thêm thành viên vào lớp thành công');
    } catch (err) {
      console.error('Error adding member:', err);
      const message = showApiError(err, 'Không thể thêm thành viên');
      setError(message);
    } finally {
      setIsAddingMember(false);
    }
  };

  const handleRemoveMember = async (member: Member) => {
    setRemoveTarget(member);
    setRemoveConfirmOpen(true);
  };

  const confirmRemoveMember = async () => {
    if (!removeTarget) return;

    try {
      setIsRemovingMember(true);
      setError(null);
      await removeMemberFromClass(classInfo.id, removeTarget.userId);

      setMembers(prev => prev.filter(m => m.userId !== removeTarget.userId));
      onSuccess();
      setRemoveConfirmOpen(false);
      setRemoveTarget(null);
      showSuccess('Thành công', 'Đã xoá thành viên khỏi lớp');
    } catch (err) {
      console.error('Error removing member:', err);
      const message = showApiError(err, 'Không thể xóa thành viên');
      setError(message);
      await loadMembers();
    } finally {
      setIsRemovingMember(false);
    }
  };

  const loadMemberUserInfo = async (member: Member) => {
    if (member.user) return;

    try {
      const user = await getUserById(member.userId);
      setMembers(prev => prev.map(m =>
        m.userId === member.userId
          ? { ...m, user: { 
              id: user.id,
              username: user.username,
              email: user.email,
              firstName: user.firstName,
              lastName: user.lastName,
              profileImage: user.profileImage
            } }
          : m
      ));
    } catch (err) {
      console.warn(`Could not load user info for userId ${member.userId}`);
    }
  };

  const filteredMembers = members.filter(member => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      member.user?.username?.toLowerCase().includes(search) ||
      member.user?.email?.toLowerCase().includes(search) ||
      member.user?.firstName?.toLowerCase().includes(search) ||
      member.user?.lastName?.toLowerCase().includes(search) ||
      String(member.userId).includes(search)
    );
  });

  const teachers = filteredMembers.filter(m => m.role === 'giao_vien');
  const students = filteredMembers.filter(m => m.role === 'sinh_vien');

  const renderStatusBadge = (status?: FormStatus | null) => {
    if (!status) {
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusBadgeStyles.DEFAULT}`}>
          {statusLabels.UNKNOWN}
        </span>
      );
    }
    const badgeKey = (status ?? "DEFAULT") as keyof typeof statusBadgeStyles;
    const tone = statusBadgeStyles[badgeKey] ?? statusBadgeStyles.DEFAULT;
    const label = statusLabels[status as keyof typeof statusLabels] ?? statusLabels.UNKNOWN;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${tone}`}>
        {label}
      </span>
    );
  };

  const handleApproveForm = async (formId: number, decision: 'APPROVED' | 'REJECTED') => {
    try {
      await studentFormApi.approveForm(formId, {
        decision,
        note: decision === 'APPROVED' ? 'Đã duyệt' : 'Đã từ chối',
      });
      const allForms = await studentFormApi.getForms();
      if (selectedStudentId) {
        const studentForms = allForms.filter(f => f.studentId === selectedStudentId);
        setForms([...studentForms].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)));
      }
      showSuccess(
        decision === 'APPROVED' ? 'Đã duyệt đơn' : 'Đã từ chối đơn',
        decision === 'APPROVED'
          ? 'Đơn của học viên đã được phê duyệt.'
          : 'Đơn của học viên đã bị từ chối.'
      );
    } catch (err) {
      console.error('Failed to approve form', err);
      const message = showApiError(
        err,
        'Không thể cập nhật trạng thái đơn. Vui lòng thử lại.',
        'Cập nhật đơn thất bại'
      );
      setError(message);
    }
  };

  const statusSummary = useMemo(() => {
    const summary = {
      total: forms.length,
      pending: 0,
      processing: 0,
      approved: 0,
      rejected: 0,
    };
    forms.forEach((form) => {
      switch (form.status) {
        case "PENDING":
          summary.pending += 1;
          break;
        case "PROCESSING":
          summary.processing += 1;
          break;
        case "APPROVED":
          summary.approved += 1;
          break;
        case "REJECTED":
          summary.rejected += 1;
          break;
        default:
          break;
      }
    });
    return summary;
  }, [forms]);

  const handleFormSuccess = useCallback(() => {
    setCurrentView('forms');
    const reloadForms = async () => {
      try {
        const allForms = await studentFormApi.getForms();
        if (selectedStudentId) {
          const studentForms = allForms.filter(f => f.studentId === selectedStudentId);
          setForms([...studentForms].sort((a, b) => (b.id ?? 0) - (a.id ?? 0)));
        }
      } catch (err) {
        console.error('Failed to reload forms', err);
      }
    };
    void reloadForms();
  }, [selectedStudentId]);

  const renderHeader = () => {
    if (currentView === 'forms' || currentView === 'create') {
      const studentName = student 
        ? `${student.firstName || ''} ${student.lastName || ''}`.trim() || student.username
        : 'Học viên';
      return (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (currentView === 'create') {
                  setCurrentView('forms');
                } else {
                  setCurrentView('members');
                  setSelectedStudentId(null);
                }
              }}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>Quay lại</span>
            </button>
            <div>
              <DialogTitle as="h2" className="text-lg font-semibold text-slate-900">
                {currentView === 'create' ? 'Tạo đơn mới' : `Danh sách đơn - ${studentName}`}
              </DialogTitle>
              <p className="text-xs text-slate-500">{classInfo.className}</p>
            </div>
          </div>
          {currentView === 'forms' && (
            <button
              onClick={() => setCurrentView('create')}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
            >
              Tạo đơn mới
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="flex items-center justify-between">
        <div>
          <DialogTitle as="h2" className="text-lg font-semibold text-slate-900">
            Quản lý thành viên
          </DialogTitle>
          <p className="text-xs text-slate-500">{classInfo.className}</p>
        </div>
      </div>
    );
  };

  return (
    <>
      <NotificationPopup notification={notification} onClose={hideNotification} />

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[1000]" onClose={handleCloseModal}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200 transition-opacity"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150 transition-opacity"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
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
                <DialogPanel className="w-full max-w-4xl transform overflow-hidden rounded-2xl border border-slate-200 bg-white text-left align-middle shadow-2xl transition-all">
                  <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
                    {renderHeader()}
                    <button
                      onClick={handleCloseModal}
                      className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                      type="button"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="max-h-[80vh] overflow-y-auto px-6 py-6">
                  {error && (
                    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {currentView === 'members' && (
                    <>
                      <div className="mb-4 flex gap-2">
                        <input
                          type="text"
                          placeholder="Tìm kiếm thành viên..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        {isAdmin && (
                          <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700"
                            type="button"
                          >
                            {showAddForm ? 'Hủy' : 'Thêm thành viên'}
                          </button>
                        )}
                      </div>
                    </>
                  )}

                  {currentView === 'forms' && (
                    <div className="space-y-4">
                      {loadingForms ? (
                        <div className="p-5">
                          <div className="space-y-3">
                            <div className="h-6 w-40 rounded bg-slate-100 animate-pulse" />
                            <div className="h-20 w-full rounded bg-slate-100 animate-pulse" />
                            <div className="h-20 w-full rounded bg-slate-100 animate-pulse" />
                            <div className="h-20 w-full rounded bg-slate-100 animate-pulse" />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="grid grid-cols-4 gap-4 mb-4">
                            <div className="bg-gray-50 rounded-lg p-4 text-center">
                              <div className="text-2xl font-bold text-gray-900">{statusSummary.total}</div>
                              <div className="text-sm text-gray-600">Tổng đơn</div>
                            </div>
                            <div className="bg-yellow-50 rounded-lg p-4 text-center">
                              <div className="text-2xl font-bold text-yellow-700">{statusSummary.pending}</div>
                              <div className="text-sm text-yellow-600">Chờ duyệt</div>
                            </div>
                            <div className="bg-teal-50 rounded-lg p-4 text-center">
                              <div className="text-2xl font-bold text-teal-700">{statusSummary.processing}</div>
                              <div className="text-sm text-teal-600">Đang xử lý</div>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 text-center">
                              <div className="text-2xl font-bold text-green-700">{statusSummary.approved}</div>
                              <div className="text-sm text-green-600">Đã duyệt</div>
                            </div>
                          </div>

                          {forms.length === 0 ? (
                            <div className="text-center py-12 text-gray-500">
                              Học viên này chưa có đơn nào
                            </div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Loại đơn
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Mã đơn
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Ngày tạo
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Trạng thái
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Thao tác
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {forms.map((form) => (
                                    <tr key={form.id} className="hover:bg-gray-50">
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {form.templateName}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                        #{form.id}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                                        {formatDate(form.createdAt) || "—"}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                        {renderStatusBadge(form.status)}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {form.status === 'PENDING' && isAdmin && (
                                          <div className="flex gap-2">
                                            <button
                                              onClick={() => handleApproveForm(form.id, 'APPROVED')}
                                              className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                              type="button"
                                            >
                                              Duyệt
                                            </button>
                                            <button
                                              onClick={() => handleApproveForm(form.id, 'REJECTED')}
                                              className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                              type="button"
                                            >
                                              Từ chối
                                            </button>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {currentView === 'create' && student && templates.length > 0 && (
                    <div className="space-y-4">
                      <StudentFormCreatePanel
                        templates={templates}
                        initialStudent={student}
                        hideStudentSearch
                        enrollmentInfo={enrollmentInfo}
                        onFormCancel={() => setCurrentView('forms')}
                        onFormSuccess={handleFormSuccess}
                      />
                    </div>
                  )}

                  {currentView === 'create' && (!student || templates.length === 0) && (
                    <div className="text-center py-12 text-gray-500">
                      {loadingTemplates ? (
                        <div className="flex items-center justify-center gap-3">
                          <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-teal-600"></div>
                          Đang tải...
                        </div>
                      ) : (
                        'Không thể hiển thị form tạo đơn'
                      )}
                    </div>
                  )}

                  {currentView === 'members' && showAddForm && (
                    <form onSubmit={handleAddMember} className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="relative">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email <span className="text-red-500">*</span>
                          </label>
                          <input
                            ref={inputRef}
                            type="text"
                            value={newMemberEmail}
                            onChange={(e) => {
                              setNewMemberEmail(e.target.value);
                              setIsUserSelected(false);
                              if (e.target.value.trim().length >= 2) {
                                setShowSuggestions(true);
                              } else {
                                setShowSuggestions(false);
                              }
                            }}
                            onKeyDown={handleKeyDown}
                            onFocus={() => {
                              if (!isUserSelected && filteredUsers.length > 0) {
                                setShowSuggestions(true);
                              }
                            }}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
                            placeholder="Nhập email hoặc tên người dùng"
                            required
                            disabled={isAddingMember}
                            autoComplete="off"
                          />

                          {showSuggestions && filteredUsers.length > 0 && (
                            <div
                              ref={suggestionsRef}
                              className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                            >
                              {filteredUsers.map((user, index) => {
                                const displayName = [user.firstName, user.lastName]
                                  .filter(Boolean)
                                  .join(' ') || user.username;

                                return (
                                  <button
                                    key={user.id}
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleSelectUser(user);
                                    }}
                                    onMouseEnter={() => setSelectedUserIndex(index)}
                                    className={`w-full text-left px-4 py-3 hover:bg-teal-50 transition-colors flex items-center gap-3 ${
                                      index === selectedUserIndex ? 'bg-teal-50' : ''
                                    } ${
                                      index === 0 ? 'rounded-t-lg' : ''
                                    } ${
                                      index === filteredUsers.length - 1 ? 'rounded-b-lg' : ''
                                    }`}
                                  >
                                    <UserAvatar
                                      src={user.profileImage}
                                      name={displayName}
                                      authorName={user.username}
                                      size="sm"
                                      userId={String(user.id)}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">
                                        {displayName}
                                      </p>
                                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    </div>
                                    {user.username && (
                                      <p className="text-xs text-gray-400 ml-2">@{user.username}</p>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Vai trò <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={newMemberRole}
                            onChange={(e) => setNewMemberRole(e.target.value as 'sinh_vien' | 'giao_vien')}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
                            disabled={isAddingMember}
                          >
                            <option value="sinh_vien">Sinh viên</option>
                            <option value="giao_vien">Giáo viên</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isAddingMember}
                        className="mt-4 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isAddingMember ? 'Đang thêm...' : 'Thêm thành viên'}
                      </button>
                    </form>
                  )}

                  {currentView === 'members' && (
                    <>
                      {loading ? (
                        <div className="space-y-3">
                          <div className="h-10 w-full rounded bg-slate-100 animate-pulse" />
                          <div className="h-10 w-full rounded bg-slate-100 animate-pulse" />
                          <div className="h-10 w-full rounded bg-slate-100 animate-pulse" />
                        </div>
                      ) : (
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                              Giáo viên ({teachers.length})
                            </h3>
                            {teachers.length === 0 ? (
                              <p className="text-gray-500 text-sm">Chưa có giáo viên</p>
                            ) : (
                              <div className="space-y-2">
                                {teachers.map((member) => (
                                  <MemberItem
                                    key={member.userId}
                                    member={member}
                                    onRemove={handleRemoveMember}
                                    onLoadUserInfo={() => loadMemberUserInfo(member)}
                                    isAdmin={isAdmin}
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                              Sinh viên ({students.length})
                            </h3>
                            {students.length === 0 ? (
                              <p className="text-gray-500 text-sm">Chưa có sinh viên</p>
                            ) : (
                              <div className="space-y-2">
                                {students.map((member) => (
                                  <MemberItem
                                    key={member.userId}
                                    member={member}
                                    onRemove={handleRemoveMember}
                                    onLoadUserInfo={() => loadMemberUserInfo(member)}
                                    isAdmin={isAdmin}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>

      <Transition appear show={isOpen && removeConfirmOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-[1100]"
          onClose={() => {
            if (isRemovingMember) return;
            setRemoveConfirmOpen(false);
            setRemoveTarget(null);
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
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
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
                <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-200 bg-white text-left align-middle shadow-2xl transition-all">
                  <div className="border-b border-slate-200 px-6 py-4">
                    <DialogTitle as="h3" className="text-lg font-semibold text-slate-900">
                      Xác nhận xoá thành viên
                    </DialogTitle>
                    <p className="mt-1 text-sm text-slate-600">
                      Bạn có chắc chắn muốn xoá{' '}
                      <span className="font-semibold text-slate-900">
                        {removeTarget?.user?.username || 'thành viên này'}
                      </span>{' '}
                      khỏi lớp?
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 px-6 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        if (isRemovingMember) return;
                        setRemoveConfirmOpen(false);
                        setRemoveTarget(null);
                      }}
                      className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                      disabled={isRemovingMember}
                    >
                      Huỷ
                    </button>
                    <button
                      type="button"
                      onClick={confirmRemoveMember}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isRemovingMember}
                    >
                      {isRemovingMember ? 'Đang xoá...' : 'Xoá'}
                    </button>
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}

interface MemberItemProps {
  member: Member;
  onRemove: (member: Member) => void;
  onLoadUserInfo: () => void;
  isAdmin: boolean;
}

function MemberItem({ member, onRemove, onLoadUserInfo, isAdmin }: MemberItemProps) {
  const [userInfo, setUserInfo] = useState(member.user);

  useEffect(() => {
    if (!userInfo && member.userId) {
      onLoadUserInfo();
    } else {
      setUserInfo(member.user);
    }
  }, [member.userId, member.user, userInfo, onLoadUserInfo]);

  const displayName = userInfo
    ? [userInfo.firstName, userInfo.lastName].filter(Boolean).join(' ') || userInfo.username
    : `User ${member.userId}`;

  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-3 flex-1">
        <UserAvatar
          src={userInfo?.profileImage}
          name={displayName}
          authorName={userInfo?.username}
          size="md"
          userId={String(member.userId)}
        />
        <div className="flex-1">
          <p className="font-medium text-gray-900">{displayName}</p>
          {userInfo?.email && (
            <p className="text-sm text-gray-500">{userInfo.email}</p>
          )}
          <p className="text-xs text-gray-400">ID: {member.userId}</p>
        </div>
      </div>

      {isAdmin && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => onRemove(member)}
            className="p-1 text-red-600 hover:bg-red-50 rounded"
            title="Xóa thành viên"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
      {!isAdmin && (
        <div className="px-3 py-1 border border-gray-300 rounded text-sm bg-gray-100 text-gray-600">
          {member.role === 'giao_vien' ? 'Giáo viên' : 'Sinh viên'}
        </div>
      )}
    </div>
  );
}

