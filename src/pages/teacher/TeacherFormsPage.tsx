import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminPageHeader from "../../components/AdminPageHeader";
import studentFormApi from "../../services/formApi";
import { useAuthStore } from "../../store/useAuthStore";
import { api } from "../../services/api";
import type {
  FormTemplate,
  FormStatus,
  StudentFormResponse,
} from "../../types/form";

const statusBadgeStyles: Record<FormStatus | "DEFAULT", string> = {
  APPROVED: "text-green-600",
  REJECTED: "text-red-600",
  PROCESSING: "text-blue-600",
  PENDING: "text-gray-800",
  DEFAULT: "text-gray-600",
};

const statusLabels: Record<FormStatus | "UNKNOWN", string> = {
  APPROVED: "ĐÃ DUYỆT",
  REJECTED: "TỪ CHỐI",
  PROCESSING: "ĐANG XỬ LÝ",
  PENDING: "CHỜ DUYỆT",
  UNKNOWN: "KHÔNG RÕ",
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
  } catch {
    return value ?? "";
  }
};

interface UserClass {
  classId: number;
  userId: number;
  role: string;
  joinDate: string;
  className?: string;
}

const isTeacherRole = (role?: string) => {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return (
    normalized.includes("giao_vien") ||
    normalized.includes("teacher") ||
    normalized.includes("lecturer")
  );
};

export default function TeacherFormsPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [forms, setForms] = useState<StudentFormResponse[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("all");
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingForms, setLoadingForms] = useState(false);
  const [isInit, setIsInit] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [teacherClassIds, setTeacherClassIds] = useState<number[]>([]);

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const data = await studentFormApi.getTemplates();
        setTemplates(data);
        setErrorMessage(null);
      } catch (error) {
        console.error("Failed to load templates", error);
        setErrorMessage(
          error instanceof Error ? error.message : "Không thể tải mẫu đơn"
        );
      } finally {
        setLoadingTemplates(false);
      }
    };

    void loadTemplates();
  }, []);

  useEffect(() => {
    const loadTeacherClasses = async () => {
      if (!user?.id) return;

      try {
        const userClassesResponse = await api.get<unknown>(
          `/users/${user.id}/classes`
        );
        const parseUserClasses = (payload: unknown): UserClass[] => {
          if (Array.isArray(payload)) {
            return payload.map((item: any) => ({
              classId: Number(item.classId ?? item.id ?? 0),
              userId: Number(item.userId ?? user?.id ?? 0),
              role: String(item.role ?? ""),
              joinDate: item.joinDate ?? "",
              className: item.className ?? "",
            }));
          }
          if (
            payload &&
            typeof payload === "object" &&
            Array.isArray((payload as any).classes)
          ) {
            return (payload as any).classes.map((item: any) => ({
              classId: Number(item.classId ?? item.id ?? 0),
              userId: Number(item.userId ?? user?.id ?? 0),
              role: String(item.role ?? ""),
              joinDate: item.joinDate ?? "",
              className: item.className ?? "",
            }));
          }
          return [];
        };

        const allClasses: UserClass[] = parseUserClasses(userClassesResponse);
        const teacherClasses = allClasses.filter((cls) =>
          isTeacherRole(cls.role)
        );
        const classIds = teacherClasses
          .map((cls) => cls.classId)
          .filter((id) => id > 0);
        setTeacherClassIds(classIds);
      } catch (error) {
        console.error("Failed to load teacher classes", error);
        setTeacherClassIds([]);
      }
    };

    void loadTeacherClasses();
  }, [user?.id]);

  const loadForms = useCallback(async () => {
    if (!templates.length) return;

    try {
      setLoadingForms(true);
      setErrorMessage(null);

      const allForms = await studentFormApi.getForms();
      let filtered = allForms;

      if (teacherClassIds.length > 0) {
        filtered = filtered.filter(
          (form) => form.classId && teacherClassIds.includes(form.classId)
        );
      } else {
        filtered = [];
      }

      if (selectedTemplate !== "all") {
        const templateId = Number(selectedTemplate);
        const template = templates.find((tpl) => tpl.id === templateId);
        if (template?.name) {
          filtered = filtered.filter(
            (form) => form.templateName === template.name
          );
        }
      }

      const sorted = [...filtered].sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
      setForms(sorted);
    } catch (error) {
      console.error("Failed to load forms", error);
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể tải danh sách đơn"
      );
    } finally {
      setLoadingForms(false);
      setIsInit(true);
    }
  }, [selectedTemplate, templates, teacherClassIds]);

  useEffect(() => {
    void loadForms();
  }, [loadForms]);

  const totalForms = useMemo(() => forms.length, [forms]);
  const renderStatusBadge = (status?: FormStatus | null) => {
    if (!status) {
      return (
        <span className={`text-sm font-medium ${statusBadgeStyles.DEFAULT}`}>
          {statusLabels.UNKNOWN}
        </span>
      );
    }
    const badgeKey = (status ?? "DEFAULT") as keyof typeof statusBadgeStyles;
    const tone = statusBadgeStyles[badgeKey] ?? statusBadgeStyles.DEFAULT;
    const label =
      statusLabels[status as keyof typeof statusLabels] ?? statusLabels.UNKNOWN;
    return (
      <span className={`text-sm font-medium ${tone}`}>
        {label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        breadcrumbs={[
          {
            label: "Trang chủ",
            onClick: () => navigate("/"),
            active: false,
          },
          { label: "Quản lý đơn", active: true },
        ]}
        title="Quản lý danh sách đơn"
        description="Giáo viên xem và xét duyệt các đơn chuyển lớp, bảo lưu, đình chỉ, thôi học."
        chips={[
          {
            label: "Tổng số đơn",
            value: loadingForms ? "..." : totalForms,
            tone: "indigo",
          },
        ]}
      />

      {errorMessage && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg">
          {errorMessage}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex flex-col gap-4 p-6 border-b border-gray-100 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Danh sách đơn
            </h2>
            <p className="text-sm text-gray-500">
              Chọn loại đơn để lọc danh sách hoặc xem tất cả.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">
              Loại đơn
            </label>
            <select
              className="rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              disabled={loadingTemplates}
            >
              <option value="all">Tất cả loại đơn</option>
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Loại đơn
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Mã đơn
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Học viên
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Lớp học
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Chương trình
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Ngày tạo đơn
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Trạng thái
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 bg-white text-sm">
              {loadingForms && (
                <tr>
                  <td
                    className="px-6 py-6 text-center text-gray-500"
                    colSpan={7}
                  >
                    <div className="flex items-center justify-center gap-3">
                      <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                      Đang tải danh sách đơn...
                    </div>
                  </td>
                </tr>
              )}

              {isInit && !loadingForms && forms.length === 0 && (
                <tr>
                  <td
                    className="px-6 py-6 text-center text-gray-500"
                    colSpan={7}
                  >
                    Chưa có đơn nào cho bộ lọc hiện tại.
                  </td>
                </tr>
              )}

              {!loadingForms &&
                forms.map((form) => (
                  <tr
                    key={form.id}
                    className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/teacher/forms/${form.id}`)}
                  >
                    <td className="px-6 py-4 font-semibold text-gray-900">
                      {form.templateName}
                    </td>
                    <td className="px-6 py-4 text-gray-600">#{form.id}</td>
                    <td className="px-6 py-4 text-gray-900">
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {form.studentName || "—"}
                        </span>
                        <span className="text-xs text-gray-500">
                          Mã HV: {form.studentId ?? "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {form.className || "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {form.programName || "—"}
                    </td>
                    <td className="px-6 py-4 text-gray-700">
                      {formatDate(form.createdAt) || "—"}
                    </td>
                    <td className="px-6 py-4">
                      {renderStatusBadge(form.status)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
