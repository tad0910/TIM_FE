import { Fragment, useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { CalendarDays, ClipboardList, Hash, User } from "lucide-react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import studentFormApi from "../../services/formApi";
import { useAuthStore } from "../../store/useAuthStore";
import { api } from "../../services/api";
import { useIsAdmin } from "../../utils/useIsAdmin";
import { useAdminHeader } from "../../components/admin/layout/AdminShell";
import {
  getProgramById,
  getSessionsByModule,
  type ModuleDTO,
  type SessionDetailDTO,
} from "../../services/moduleSessionApi";
import { getClassInfo, getAllClassesAsArray } from "../../services/classApi";
import NotificationPopup, { type Notification } from "../../components/NotificationPopup";
import { getErrorMessage } from "../../utils/error";
import type {
  ApprovalStatus,
  FormStatus,
  StudentFormResponse,
} from "../../types/form";

const formatDate = (value?: string | null) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value ?? "";
  }
};

const UnderlinedField = ({
  value,
  placeholder = "",
  editable = false,
  onChange,
  className = "",
  fullWidth = false,
}: {
  value?: string | null;
  placeholder?: string;
  editable?: boolean;
  onChange?: (value: string) => void;
  className?: string;
  fullWidth?: boolean;
}) => {
  const displayValue = value || "";
  const isEmpty = !displayValue;
  const baseClass = fullWidth ? "block w-full" : "inline-block min-w-[200px]";

  if (editable && onChange) {
    return (
      <input
        type="text"
        value={displayValue}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${baseClass} bg-transparent border-0 border-b-2 border-gray-400 focus:border-blue-500 focus:outline-none px-1 text-green-600 ${className}`}
        style={{ borderBottom: "2px solid #9ca3af" }}
      />
    );
  }

  return (
    <span
      className={`${baseClass} border-b-2 border-gray-400 px-1 ${
        isEmpty ? "text-gray-400" : "text-green-600"
      } ${className}`}
      style={{ borderBottom: "2px solid #9ca3af" }}
    >
      {isEmpty ? placeholder : displayValue}
    </span>
  );
};


const detailRow = (
  label: string,
  value?: string | number | null,
  options?: {
    labelColor?: string;
    textColor?: string;
    allowHtml?: boolean;
    underlined?: boolean;
    editable?: boolean;
    onChange?: (value: string) => void;
  }
) => (
  <div className="flex gap-5 border-b border-slate-300 py-3 text-sm md:text-base">
    <div
      className={`w-52 shrink-0 font-semibold ${
        options?.labelColor ?? "text-teal-900"
      }`}
    >
      {label}
    </div>
    <div
      className={`flex-1 min-h-[24px] whitespace-pre-line ${
        options?.textColor ?? "text-slate-900"
      }`}
    >
      {options?.underlined ? (
        options?.editable && options?.onChange ? (
          <UnderlinedField
            value={value?.toString()}
            editable={true}
            onChange={options.onChange}
          />
        ) : (
          <UnderlinedField value={value?.toString()} />
        )
      ) : options?.allowHtml && typeof value === "string" ? (
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: value }}
        />
      ) : (
        value || ""
      )}
    </div>
  </div>
);

interface UserClass {
  classId: number;
  userId: number;
  role: string;
  joinDate: string;
  className?: string;
}

type ApprovalRoleKey = "coach" | "academic" | "accountant" | "admin";

interface ApprovalCardConfig {
  role: ApprovalRoleKey;
  label: string;
  name?: string | null;
  status?: ApprovalStatus;
  dropdownKey: string;
}

const isTeacherRole = (role?: string) => {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return (
    normalized.includes('giao_vien') ||
    normalized.includes('teacher') ||
    normalized.includes('lecturer')
  );
};

// Helper function to map user role to approval role key
const getUserApprovalRole = (userRole?: string): ApprovalRoleKey | null => {
  if (!userRole) return null;
  const roleUpper = userRole.toUpperCase();
  if (roleUpper === "ROLE_GIAO_VIEN" || roleUpper.includes("GIAO_VIEN") || roleUpper.includes("TEACHER")) {
    return "coach";
  }
  if (roleUpper === "ROLE_GIAO_VU" || roleUpper.includes("GIAO_VU") || roleUpper.includes("ACADEMIC")) {
    return "academic";
  }
  if (roleUpper === "ROLE_KE_TOAN" || roleUpper.includes("KE_TOAN") || roleUpper.includes("ACCOUNTANT")) {
    return "accountant";
  }
  if (roleUpper === "ROLE_ADMIN" || roleUpper === "ADMIN") {
    return "admin";
  }
  return null;
};

const useOptionalAdminHeader = () => {
  try {
    return useAdminHeader();
  } catch {
    return null;
  }
};

export default function StudentFormDetailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { isAdmin } = useIsAdmin();
  const { formId } = useParams<{ formId: string }>();
  const numericId = Number(formId);
  const isTeacherRoute = location.pathname.startsWith('/teacher/forms');
  const [form, setForm] = useState<StudentFormResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [teacherClassIds, setTeacherClassIds] = useState<number[]>([]);
  const [hasAccess, setHasAccess] = useState<boolean>(true);
  const [teacherClassesLoaded, setTeacherClassesLoaded] = useState<boolean>(false);
  
  const [openApprovalModal, setOpenApprovalModal] = useState<{
    role: ApprovalRoleKey | null;
    note: string;
    decision: ApprovalStatus;
  } | null>(null);
  const [programModules, setProgramModules] = useState<ModuleDTO[]>([]);
  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null);
  const [moduleSessions, setModuleSessions] = useState<SessionDetailDTO[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);
  const [loadingModules, setLoadingModules] = useState(false);
  const [moduleSessionsLoading, setModuleSessionsLoading] = useState(false);
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [selectedTargetClassId, setSelectedTargetClassId] = useState<number | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);
  const adminHeader = useOptionalAdminHeader();

  const isFormApproved = form?.status === "APPROVED";
  const isReadOnly = isFormApproved;
  const isTransferClassForm = form?.templateName?.toLowerCase().includes("chuyển lớp");
  const syncFormDetail = useCallback((detail: StudentFormResponse) => {
    setForm(detail);
    setSelectedModuleId(detail.moduleId ?? null);
    setSelectedSessionId(detail.moduleSessionId ?? null);
    const maybeTargetClassId = (detail as any).targetClassId;
    setSelectedTargetClassId(
      typeof maybeTargetClassId === "number" ? maybeTargetClassId : null
    );
  }, []);

  useEffect(() => {
    const loadTeacherClasses = async () => {
      if (!isTeacherRoute || !user?.id) {
        setHasAccess(true);
        return;
      }
      
      try {
        const userClassesResponse = await api.get<unknown>(`/users/${user.id}/classes`);
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
        
        const allClasses: UserClass[] = parseUserClasses(userClassesResponse);
        const teacherClasses = allClasses.filter((cls) => isTeacherRole(cls.role));
        const classIds = teacherClasses.map((cls) => cls.classId).filter((id) => id > 0);
        setTeacherClassIds(classIds);
        setTeacherClassesLoaded(true);
      } catch (error) {
        console.error("Failed to load teacher classes", error);
        setTeacherClassIds([]);
        setTeacherClassesLoaded(true);
      }
    };

    if (isTeacherRoute && user?.id) {
      void loadTeacherClasses();
    } else {
      setTeacherClassesLoaded(true);
    }
  }, [isTeacherRoute, user?.id]);

  useEffect(() => {
    if (!numericId) {
      setErrorMessage("Không xác định được mã đơn.");
      setLoading(false);
      return;
    }

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const detail = await studentFormApi.getFormDetail(numericId);
        
        if (isTeacherRoute && teacherClassIds.length > 0) {
          if (!detail.classId || !teacherClassIds.includes(detail.classId)) {
            setErrorMessage("Bạn không có quyền xem đơn này. Đơn này thuộc lớp khác.");
            setHasAccess(false);
            setLoading(false);
            return;
          }
        }
        
        syncFormDetail(detail);
        await loadProgramStructure(detail);
        await loadAllClasses();
        setErrorMessage(null);
        setHasAccess(true);
      } catch (error) {
        console.error("Failed to load form detail", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Không thể tải chi tiết đơn"
        );
      } finally {
        setLoading(false);
      }
    };

    if (isTeacherRoute && !teacherClassesLoaded) {
      return;
    }

    void fetchDetail();
  }, [numericId, isTeacherRoute, teacherClassIds, teacherClassesLoaded, syncFormDetail]);

  useEffect(() => {
    if (!adminHeader || isTeacherRoute) return;
    const crumbLabel =
      form?.id ? `#${form.id}` : formId ? `#${formId}` : "Chi tiết";
    adminHeader.updateHeader({
      title: "Chi tiết đơn",
      breadcrumbs: [
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Đơn từ", href: "/admin/forms" },
        { label: crumbLabel },
      ],
    });
    return () => {
      adminHeader.resetHeader();
    };
  }, [adminHeader, form?.id, formId, isTeacherRoute]);

  const handleOpenApprovalModal = (role: ApprovalRoleKey) => {
    if (!form || isReadOnly) return;
    setOpenApprovalModal({
      role,
      note: "",
      decision: "APPROVED",
    });
  };

  const handleCloseApprovalModal = () => {
    setOpenApprovalModal(null);
  };

  const handleSubmitApproval = async () => {
    if (!form || !openApprovalModal || isReadOnly) return;
    
    const { role, note, decision } = openApprovalModal;
    
    if (!note || note.trim() === "") {
      setNotification({
        id: Date.now().toString(),
        type: "error",
        title: "Lỗi",
        message: "Vui lòng nhập ghi chú trước khi xác nhận xét duyệt.",
        duration: 3000,
      });
      return;
    }
    
    const getTargetRole = (): string | undefined => {
      // Only admin can specify targetRole to approve on behalf of others
      if (isAdmin) {
        return role === "coach" ? "ROLE_GIAO_VIEN" : 
               role === "academic" ? "ROLE_GIAO_VU" :
               role === "accountant" ? "ROLE_KE_TOAN" :
               "ROLE_ADMIN";
      }
      // Non-admin users should not send targetRole - backend will use their own role
      return undefined;
    };

    const targetRole = getTargetRole();

    const approvalData: {
      decision: ApprovalStatus;
      note?: string;
      targetRole?: string;
      moduleId?: number | null;
      moduleSessionId?: number | null;
    } = {
      decision,
      note: note || undefined,
    };
    
    if (targetRole !== undefined) {
      approvalData.targetRole = targetRole;
    }

    if (role === "coach") {
      approvalData.moduleId = selectedModuleId;
      approvalData.moduleSessionId = selectedSessionId;
    }
    
    try {
      await studentFormApi.approveForm(form.id, approvalData);
      const refreshedDetail = await studentFormApi.getFormDetail(form.id);
      syncFormDetail(refreshedDetail);
      await loadProgramStructure(refreshedDetail);
      setOpenApprovalModal(null);
      
      const roleLabel = approvalCardConfigs.find(c => c.role === role)?.label || role;
      const actionLabel = decision === "APPROVED" ? "xác nhận" : "từ chối";
      setNotification({
        id: Date.now().toString(),
        type: "success",
        title: "Thành công",
        message: `Đã ${actionLabel} đơn thành công cho ${roleLabel}`,
        duration: 3000,
      });
    } catch (error) {
      console.error("Failed to update approval", error);
      const errorMessage = getErrorMessage(error, "Không thể cập nhật trạng thái phê duyệt. Vui lòng thử lại.");
      setNotification({
        id: Date.now().toString(),
        type: "error",
        title: "Lỗi",
        message: errorMessage,
        duration: 5000,
      });
    }
  };




  const getStatusLabel = (status?: ApprovalStatus) => {
    if (status === "APPROVED") return "Đã xác nhận";
    if (status === "REJECTED") return "Từ chối";
    if (status === "PROCESSING") return "Đang xử lý";
    return "Chờ duyệt";
  };

  const getFormStatusLabel = (status?: FormStatus) => {
    if (status === "APPROVED") return "Đã duyệt";
    if (status === "REJECTED") return "Từ chối";
    if (status === "PROCESSING") return "Đang xử lý";
    return "Chờ duyệt";
  };

  const getApprovalToneClasses = (status?: ApprovalStatus) => {
    if (status === "APPROVED") {
      return {
        nameClass: "text-emerald-600",
        badgeClass: "bg-emerald-50 text-emerald-700 border border-emerald-100",
      };
    }
    if (status === "REJECTED") {
      return {
        nameClass: "text-rose-600",
        badgeClass: "bg-rose-50 text-rose-700 border border-rose-100",
      };
    }
    if (status === "PROCESSING") {
      return {
        nameClass: "text-amber-600",
        badgeClass: "bg-amber-50 text-amber-700 border border-amber-100",
      };
    }
    return {
      nameClass: "text-slate-500",
      badgeClass: "bg-slate-100 text-slate-600 border border-slate-200",
    };
  };


  const resolveProgramId = async (detail: StudentFormResponse) => {
    if (detail.programId) {
      return detail.programId;
    }

    if (detail.classId) {
      try {
        const classInfo = await getClassInfo(detail.classId);
        return classInfo.programId ?? classInfo.program?.id ?? null;
      } catch (error) {
        console.error("Failed to resolve program via classId", error);
      }
    }

    if (detail.className) {
      try {
        const classes = await getAllClassesAsArray();
        const matched = classes.find(
          (cls) => cls.className?.trim().toLowerCase() === detail.className?.trim().toLowerCase()
        );
        if (matched) {
          return matched.programId ?? matched.program?.id ?? null;
        }
      } catch (error) {
        console.error("Failed to resolve program via class list", error);
      }
    }

    return null;
  };

  async function handleSelectModule(
    moduleId: number,
    presetSessionId?: number | null
  ) {
    setSelectedModuleId(moduleId);

    const cachedModule = programModules.find((module) => module.id === moduleId);
    if (cachedModule?.sessions && cachedModule.sessions.length > 0) {
      setModuleSessions(cachedModule.sessions);
      const initialSessionId =
        presetSessionId ?? cachedModule.sessions[0]?.id ?? null;
      setSelectedSessionId(initialSessionId ?? null);
      return;
    }

    setModuleSessions([]);
    setSelectedSessionId(null);
    setModuleSessionsLoading(true);
    try {
      const response = await getSessionsByModule(moduleId, 0, 100);
      const sessions = response.content ?? [];
      setModuleSessions(sessions);

      const initialSessionId =
        presetSessionId ?? (sessions.length ? sessions[0].id : null);
      setSelectedSessionId(initialSessionId ?? null);
    } catch (error) {
      console.error("Failed to load sessions for module", error);
      setModuleSessions([]);
      setSelectedSessionId(null);
    } finally {
      setModuleSessionsLoading(false);
    }
  }

  async function loadAllClasses() {
    try {
      setLoadingClasses(true);
      const classes = await getAllClassesAsArray();
      setAllClasses(classes);
    } catch (error) {
      console.error("Failed to load classes", error);
      setAllClasses([]);
    } finally {
      setLoadingClasses(false);
    }
  }

  async function loadProgramStructure(detail: StudentFormResponse) {
    try {
      setLoadingModules(true);
      let derivedProgramId = await resolveProgramId(detail);

      if (!derivedProgramId) {
        setProgramModules([]);
        setModuleSessions([]);
        setSelectedModuleId(null);
        setSelectedSessionId(null);
        return;
      }

      const program = await getProgramById(derivedProgramId);
      const modules = program?.modules ?? [];
      setProgramModules(modules);

      if (detail.moduleId) {
        await handleSelectModule(detail.moduleId, detail.moduleSessionId);
      } else {
        setModuleSessions([]);
        setSelectedModuleId(null);
        setSelectedSessionId(null);
      }
    } catch (error) {
      console.error("Failed to load modules for program", error);
      setProgramModules([]);
      setModuleSessions([]);
      setSelectedModuleId(null);
      setSelectedSessionId(null);
    } finally {
      setLoadingModules(false);
    }
  }

  const approvalCardConfigs: ApprovalCardConfig[] = form
    ? [
        {
          role: "coach",
          label: "Coach",
          name: form.coachName,
          status: form.coachApproval,
          dropdownKey: "coach",
        },
        {
          role: "accountant",
          label: "Kế toán",
          name: form.accountantName,
          status: form.accountantApproval,
          dropdownKey: "accountant",
        },
        {
          role: "academic",
          label: "Giáo vụ",
          name: form.academicName,
          status: form.academicApproval,
          dropdownKey: "academic",
        },
        {
          role: "admin",
          label: "Giám đốc Trung tâm đào tạo",
          name: form.adminName,
          status: form.adminApproval,
          dropdownKey: "director",
        },
      ]
    : [];

  const renderApprovalCard = (
    card: ApprovalCardConfig,
    readOnly: boolean,
    extraClass = ""
  ) => {
    const statusLabel = getStatusLabel(card.status);
    const tone = getApprovalToneClasses(card.status);
    const userApprovalRole = getUserApprovalRole(user?.role);
    // Only allow interaction if:
    // 1. Not read-only
    // 2. Status is pending/processing
    // 3. User is admin OR user's role matches the card's role
    const requiresAction =
      !readOnly &&
      card.status !== "APPROVED" &&
      card.status !== "REJECTED" &&
      (isAdmin || userApprovalRole === card.role);

    return (
      <div
        key={card.role}
        className={`flex min-h-[190px] w-full max-w-sm flex-col items-center rounded-3xl bg-white/90 p-5 text-center shadow-sm ${extraClass}`}
      >
        <p className="text-lg font-semibold text-indigo-800">{card.label}</p>
        <p className={`mt-2 text-sm font-medium ${tone.nameClass}`}>
          {card.name || "Chưa có người xử lý"}
        </p>
        <span
          className={`mt-4 inline-flex rounded-full px-4 py-1 text-xs font-semibold uppercase tracking-wide ${tone.badgeClass}`}
        >
          {statusLabel}
        </span>
        {requiresAction && (
          <div className="status-dropdown-container relative mt-4">
            <button
              type="button"
              onClick={() => handleOpenApprovalModal(card.role)}
              className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-blue-500 bg-gradient-to-r from-blue-500 to-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:from-blue-600 hover:to-indigo-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              Xác nhận
            </button>
          </div>
        )}
      </div>
    );
  };

  const summaryCards = form
    ? [
        {
          label: "Mã đơn",
          value: form.id ? `#${form.id}` : "—",
          icon: Hash,
          tone: "teal" as const,
        },
        {
          label: "Loại đơn",
          value: form.templateName ?? "Chưa xác định",
          icon: ClipboardList,
          tone: "slate" as const,
        },
        {
          label: "Học viên",
          value: form.studentName ?? "—",
          icon: User,
          tone: "teal" as const,
        },
        {
          label: "Ngày tạo",
          value: form.createdAt ? formatDate(form.createdAt) : "—",
          icon: CalendarDays,
          tone: "amber" as const,
        },
      ]
    : [];

  const toneStyles = {
    teal: "bg-teal-50 text-teal-600",
    slate: "bg-slate-100 text-slate-700",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-rose-50 text-rose-600",
  } as const;

  const getStatusBadgeClass = (status?: FormStatus) => {
    if (status === "APPROVED") {
      return "bg-emerald-50 text-emerald-700 border border-emerald-100";
    }
    if (status === "REJECTED") {
      return "bg-rose-50 text-rose-600 border border-rose-100";
    }
    if (status === "PROCESSING") {
      return "bg-amber-50 text-amber-700 border border-amber-100";
    }
    return "bg-slate-100 text-slate-700 border border-slate-200";
  };

  const renderApprovalGrid = (readOnly: boolean) => {
    if (!approvalCardConfigs.length) return null;
    return (
      <div className="space-y-8">
        <div className="flex justify-center">
          <div className="grid w-full max-w-5xl gap-6 md:grid-cols-3">
            {approvalCardConfigs.slice(0, 3).map((card) =>
              renderApprovalCard(card, readOnly)
            )}
          </div>
        </div>
        {approvalCardConfigs.length > 3 && (
          <div className="flex justify-center">
            <div className="grid w-full max-w-5xl gap-6 md:grid-cols-3">
              {approvalCardConfigs.slice(3).map((card, _, arr) =>
                renderApprovalCard(
                  card,
                  readOnly,
                  arr.length === 1 ? "md:col-start-2" : ""
                )
              )}
            </div>
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="space-y-6">
      {form && (
        <section className="space-y-4 rounded-2xl border border-slate-100 bg-white/80 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-400">
                Quản lý đơn
              </p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-900">
                Chi tiết đơn từ
              </h1>
            </div>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${getStatusBadgeClass(
                form.status
              )}`}
            >
              {getFormStatusLabel(form.status)}
            </span>
          </div>
          {!!summaryCards.length && (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {card.label}
                      </p>
                      <p className="mt-2 text-xl font-semibold text-slate-900">
                        {card.value}
                      </p>
                    </div>
                    <span
                      className={`rounded-full p-3 ${
                        toneStyles[card.tone as keyof typeof toneStyles]
                      }`}
                    >
                      <card.icon className="h-4 w-4" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {errorMessage && (
        <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-red-700">
          {errorMessage}
        </div>
      )}

      {loading && (
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-teal-100 bg-white">
          <div className="text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-teal-500"></div>
            <p className="text-sm text-gray-600">Đang tải chi tiết đơn...</p>
          </div>
        </div>
      )}

      {!loading && form && hasAccess && (
        <div className="rounded-[32px] border border-teal-100 bg-white px-6 py-8 shadow-sm lg:px-12 lg:py-12">
          <div className="text-center">
            <p className="text-[32px] font-semibold text-teal-900 uppercase tracking-[0.2em]">
              {form.templateName || "Chi tiết đơn"}
            </p>
            <p className="mt-2 text-sm text-teal-600">
              Thông tin chi tiết và trạng thái xử lý của đơn.
            </p>
          </div>

          <div className="mt-10 space-y-10">
            <section>
              <p className="text-lg font-semibold text-teal-700">
                Phần dành cho học viên
              </p>
              <div className="mt-3 border-t border-slate-300">
                {detailRow("Mã học viên", form.studentId)}
                {detailRow("Họ tên", form.studentName)}
                {detailRow("Số điện thoại", form.phoneNumber)}
                {detailRow("Email", form.email)}
                {detailRow("Trạng thái", "Đang học")}
                {detailRow("Lớp học", form.className)}
                {detailRow("Chương trình học", form.programName)}
                {form.templateName?.toLowerCase().includes("bảo lưu") && detailRow(
                  "Thời hạn bảo lưu",
                  form.startDate || form.endDate
                    ? `${formatDate(form.startDate)} - ${formatDate(
                        form.endDate
                      )}`
                    : ""
                )}
                {form.templateName?.toLowerCase().includes("đình chỉ") && detailRow(
                  "Thời điểm đình chỉ",
                  form.decisionDate || form.startDate ? formatDate(form.decisionDate || form.startDate) : ""
                )}
                {form.templateName?.toLowerCase().includes("thôi học") && detailRow(
                  "Thời gian thôi học",
                  form.withdrawalDate || form.startDate ? formatDate(form.withdrawalDate || form.startDate) : ""
                )}
                {form.templateName?.toLowerCase().includes("chuyển lớp") && detailRow(
                  "Trạng thái",
                  (form as any).status || ""
                )}
                {detailRow(
                  form.templateName?.toLowerCase().includes("bảo lưu") ? "Lý do bảo lưu" : 
                  form.templateName?.toLowerCase().includes("đình chỉ") ? "Lý do đình chỉ" :
                  form.templateName?.toLowerCase().includes("thôi học") ? "Lý do" :
                  form.templateName?.toLowerCase().includes("chuyển lớp") ? "Lý do" : "Lý do",
                  form.reason,
                  { allowHtml: true }
                )}
              </div>
            </section>

            <section className="border-t border-slate-300 pt-6">
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-base font-semibold text-teal-700">
                    Phần dành cho giáo vụ
                  </p>
                  {isTransferClassForm && (
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                      <span className="text-sm font-medium text-gray-700 md:min-w-[400px]">
                        Lớp học dự kiến sẽ chuyển:
                      </span>
                      <div className="flex-1 w-full">
                        <select
                          className="w-full border-0 border-b-2 border-gray-400 bg-white px-1 py-1 text-sm text-green-600 focus:border-blue-500 focus:outline-none"
                          value={selectedTargetClassId ?? ""}
                          onChange={(e) =>
                            setSelectedTargetClassId(
                              e.target.value ? Number(e.target.value) : null
                            )
                          }
                          disabled={isReadOnly || loadingClasses}
                        >
                          <option value="">Chưa có lớp</option>
                          {allClasses.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.className}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                    <span className="text-sm font-medium text-gray-700 md:min-w-[400px]">
                      Ghi chú của Giáo vụ trung tâm:
                    </span>
                    <div className="flex-1 w-full">
                      {form.academicNote ? (
                        <UnderlinedField
                          value={form.academicNote}
                          fullWidth
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-5 border-t border-gray-200 pt-4">
                  <p className="text-base font-semibold text-teal-700">
                    Phần dành cho huấn luyện viên
                  </p>
                  <div className="space-y-5">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                      <span className="text-sm font-medium text-gray-700 md:min-w-[400px]">
                        Module:
                      </span>
                      <div className="flex-1 w-full">
                        {form.moduleId ? (
                          <UnderlinedField
                            value={
                              programModules.find((m) => m.id === form.moduleId)?.name ||
                              `Module #${form.moduleId}`
                            }
                            fullWidth
                          />
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                      <span className="text-sm font-medium text-gray-700 md:min-w-[400px]">
                        Bài học đã hoàn thành:
                      </span>
                      <div className="flex-1 w-full">
                        {form.moduleSessionId ? (
                          <UnderlinedField
                            value={
                              moduleSessions.find((s) => s.id === form.moduleSessionId)?.title ||
                              `Bài học #${form.moduleSessionId}`
                            }
                            fullWidth
                          />
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                      <span className="text-sm font-medium text-gray-700 md:min-w-[400px]">
                        Ghi chú của Huấn luyện viên:
                      </span>
                      <div className="flex-1 w-full">
                        {form.coachNote ? (
                          <UnderlinedField
                            value={form.coachNote}
                            fullWidth
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <p className="text-base font-semibold text-teal-700">
                    Phần dành cho kế toán trung tâm
                  </p>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                    <span className="text-sm font-medium text-gray-700 md:min-w-[400px]">
                      Trạng thái học phí:
                    </span>
                    <div className="flex-1 w-full">
                      {form.accountantNote ? (
                        <UnderlinedField
                          value={form.accountantNote}
                          fullWidth
                        />
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <p className="text-base font-semibold text-teal-700">
                    Phần dành cho Giám đốc Trung tâm đào tạo
                  </p>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
                    <span className="text-sm font-medium text-gray-700 md:min-w-[400px]">
                      Ghi chú của Giám đốc Trung tâm đào tạo:
                    </span>
                    <div className="flex-1 w-full">
                      {form.adminNote ? (
                        <UnderlinedField
                          value={form.adminNote}
                          fullWidth
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {!isReadOnly && (
              <section className="border-t border-slate-300 pt-6">
                <div className="space-y-6">
                  <p className="text-base font-semibold text-teal-700">
                    Trạng thái phê duyệt
                  </p>
                  {renderApprovalGrid(false)}
                </div>
              </section>
            )}

            {isReadOnly && (
              <section className="border-t border-slate-300 pt-6">
                <div className="space-y-6">
                  <p className="text-base font-semibold text-teal-700">
                    Trạng thái phê duyệt
                  </p>
                  {renderApprovalGrid(true)}
                </div>
              </section>
            )}

            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() =>
                  navigate(isTeacherRoute ? "/teacher/forms" : "/admin/forms")
                }
                className="rounded-lg border border-slate-300 px-6 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Quay lại danh sách
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {openApprovalModal && (
        <Transition appear show as={Fragment}>
          <Dialog
            as="div"
            className="relative z-[1000]"
            onClose={() => {
              handleCloseApprovalModal();
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
                  <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-2xl border border-slate-200 bg-white text-left align-middle shadow-xl transition-all">
                    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">
                          Xét duyệt đơn
                        </p>
                        <DialogTitle as="h3" className="mt-1 text-xl font-semibold text-slate-900">
                          {
                            approvalCardConfigs.find((c) => c.role === openApprovalModal.role)
                              ?.label
                          }
                        </DialogTitle>
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                          form?.status
                        )}`}
                      >
                        {form ? getFormStatusLabel(form.status) : "—"}
                      </span>
                    </div>

                    <div className="space-y-5 px-6 py-5">
                      {openApprovalModal.role === "coach" && (
                        <div className="space-y-4 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                          <p className="text-sm font-semibold text-slate-700">Thông tin lớp/module</p>
                          <div className="space-y-3">
                            <div>
                              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                Module
                              </label>
                              <select
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50"
                                value={selectedModuleId ?? ""}
                                onChange={(e) => {
                                  const value = e.target.value;
                                  if (!value) {
                                    setSelectedModuleId(null);
                                    setModuleSessions([]);
                                    setSelectedSessionId(null);
                                    return;
                                  }
                                  void handleSelectModule(Number(value));
                                }}
                                disabled={loadingModules || programModules.length === 0}
                              >
                                <option value="">
                                  {loadingModules
                                    ? "Đang tải module..."
                                    : programModules.length === 0
                                    ? "Chưa có module"
                                    : "Chọn module"}
                                </option>
                                {programModules.map((module) => (
                                  <option key={module.id} value={module.id}>
                                    {module.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-500">
                                Bài học đã hoàn thành
                              </label>
                              <select
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:bg-slate-50"
                                value={selectedSessionId ?? ""}
                                onChange={(e) =>
                                  setSelectedSessionId(e.target.value ? Number(e.target.value) : null)
                                }
                                disabled={
                                  !selectedModuleId ||
                                  moduleSessions.length === 0 ||
                                  moduleSessionsLoading
                                }
                              >
                                <option value="">
                                  {moduleSessionsLoading
                                    ? "Đang tải bài học..."
                                    : moduleSessions.length === 0
                                    ? "Chưa có bài học"
                                    : "Chọn bài học"}
                                </option>
                                {moduleSessions.map((session) => (
                                  <option key={session.id} value={session.id}>
                                    {session.title || `Session ${session.id}`}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <label className="block text-sm font-medium text-slate-700">
                          Ghi chú <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          rows={4}
                          value={openApprovalModal.note}
                          onChange={(e) =>
                            setOpenApprovalModal({
                              ...openApprovalModal,
                              note: e.target.value,
                            })
                          }
                          placeholder="Nhập ghi chú xét duyệt..."
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-sm font-medium text-slate-700">Quyết định</p>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenApprovalModal({ ...openApprovalModal, decision: "APPROVED" })
                            }
                            className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                              openApprovalModal.decision === "APPROVED"
                                ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            Đồng ý
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setOpenApprovalModal({ ...openApprovalModal, decision: "REJECTED" })
                            }
                            className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                              openApprovalModal.decision === "REJECTED"
                                ? "border-rose-500 bg-rose-50 text-rose-600"
                                : "border-slate-200 text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            Từ chối
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                      <p className="text-xs text-slate-500">
                        Thao tác sẽ được ghi nhận theo quyền hạn hiện tại của bạn.
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCloseApprovalModal}
                          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          Đóng
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitApproval}
                          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700"
                        >
                          Xác nhận
                        </button>
                      </div>
                    </div>
                  </DialogPanel>
                </TransitionChild>
              </div>
            </div>
          </Dialog>
        </Transition>
      )}
      
      {!loading && !hasAccess && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-8 text-center">
          <p className="text-red-700 font-medium mb-2">Bạn không có quyền xem đơn này</p>
          <p className="text-red-600 text-sm">Đơn này thuộc lớp khác mà bạn không quản lý.</p>
          <button
            onClick={() => navigate(isTeacherRoute ? "/teacher/forms" : "/admin/forms")}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
          >
            Quay lại danh sách đơn
          </button>
        </div>
      )}

      <NotificationPopup
        notification={notification}
        onClose={() => setNotification(null)}
      />
    </div>
  );
}
