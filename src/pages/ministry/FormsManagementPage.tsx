import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminPageHeader from "../../components/AdminPageHeader";
import studentFormApi from "../../services/formApi";
import FormTransferClass from "../../components/forms/FormTransferClass";
import FormReservation from "../../components/forms/FormReservation";
import FormSuspension from "../../components/forms/FormSuspension";
import FormDropout from "../../components/forms/FormDropout";
import StudentSearch from "../../components/forms/StudentSearch";
import type { User } from "../../services/userApi";
import type {
  FormTemplate,
  FormStatus,
  StudentFormResponse,
  StudentFormCreateDTO,
} from "../../types/form";

const statusBadgeStyles: Record<FormStatus | "DEFAULT", string> = {
  APPROVED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  PROCESSING: "bg-yellow-50 text-yellow-700 border-yellow-200",
  PENDING: "bg-gray-50 text-gray-700 border-gray-200",
  DEFAULT: "bg-gray-50 text-gray-600 border-gray-200",
};

const statusLabels: Record<FormStatus | "UNKNOWN", string> = {
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  PROCESSING: "Đang xử lý",
  PENDING: "Chờ duyệt",
  UNKNOWN: "Không rõ",
};

const formatDate = (value?: string | null) => {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
  } catch {
    return value ?? "";
  }
};

interface FormRendererProps {
  templateId: number;
  templates: FormTemplate[];
  student: User;
  onCancel: () => void;
  onSuccess: () => void;
}

function FormRenderer({
  templateId,
  templates,
  student,
  onCancel,
  onSuccess,
}: FormRendererProps) {
  const template = templates.find((t) => t.id === templateId);

  const handleSubmit = async (formData: any) => {
    if (!template) return;

    try {
      const createData: StudentFormCreateDTO = {
        templateId: template.id,
        studentId: student.id,
        classId: formData.classId || 0,
        fullName:
          formData.fullName ||
          `${student.lastName || ""} ${student.firstName || ""}`.trim() ||
          student.username,
        phoneNumber: formData.phoneNumber || student.phoneNumber || "",
        email: formData.email || student.email,
        reason: formData.reason,
        startDate:
          formData.startDate || formData.decisionDate || formData.withdrawalDate,
        endDate: formData.endDate,
        targetClassId: formData.targetClassId,
        targetProgramType: formData.targetProgramType,
      };

      await studentFormApi.createForm(createData);
      onSuccess();
    } catch (error) {
      console.error("Failed to create form", error);
      alert("Không thể tạo đơn. Vui lòng thử lại.");
    }
  };

  if (!template) return null;

  const formProps = {
    onSubmit: handleSubmit,
    onCancel,
    student,
  };

  switch (template.code) {
    case "TRANSFER":
      return <FormTransferClass {...formProps} />;
    case "RESERVATION":
      return <FormReservation {...formProps} />;
    case "SUSPENSION":
      return <FormSuspension {...formProps} />;
    case "DROPOUT":
      return <FormDropout {...formProps} />;
    default:
      return (
        <div className="text-center py-12 text-gray-500">
          Loại đơn này chưa được hỗ trợ
        </div>
      );
  }
}

export default function FormsManagementPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"manage" | "create">("manage");
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [forms, setForms] = useState<StudentFormResponse[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("all");
  const [selectedFormType, setSelectedFormType] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<User | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [loadingForms, setLoadingForms] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const loadForms = useCallback(async () => {
    if (!templates.length) return;

    try {
      setLoadingForms(true);
      setErrorMessage(null);

      const allForms = await studentFormApi.getForms();
      let filtered = allForms;

      if (selectedTemplate !== "all") {
        const templateId = Number(selectedTemplate);
        const template = templates.find((tpl) => tpl.id === templateId);
        if (template?.name) {
          filtered = allForms.filter((form) => form.templateName === template.name);
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
    }
  }, [selectedTemplate, templates]);

  useEffect(() => {
    void loadForms();
  }, [loadForms]);

  const totalForms = useMemo(() => forms.length, [forms]);
  const renderStatusBadge = (status?: FormStatus | null) => {
    if (!status) {
      return (
        <span
          className={`text-xs px-2 py-1 rounded-full border ${statusBadgeStyles.DEFAULT}`}
        >
          {statusLabels.UNKNOWN}
        </span>
      );
    }
    const badgeKey = (status ?? "DEFAULT") as keyof typeof statusBadgeStyles;
    const tone = statusBadgeStyles[badgeKey] ?? statusBadgeStyles.DEFAULT;
    const label =
      statusLabels[status as keyof typeof statusLabels] ?? statusLabels.UNKNOWN;
    return (
      <span className={`text-xs px-2 py-1 rounded-full border ${tone}`}>
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
        title="Quản lý đơn từ"
        description="Giáo vụ theo dõi và tạo mới các đơn chuyển lớp, bảo lưu, đình chỉ, thôi học."
        chips={[
          {
            label: "Tổng số đơn",
            value: loadingForms ? "..." : totalForms,
            tone: "indigo",
          },
        ]}
      />

      <div className="flex gap-2 border-b border-gray-200">
        <button
          type="button"
          onClick={() => setActiveTab("manage")}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === "manage"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Danh sách đơn
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("create")}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === "create"
              ? "text-indigo-600 border-b-2 border-indigo-600"
              : "text-gray-600 hover:text-gray-900"
          }`}
        >
          Tạo đơn mới
        </button>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-4 py-3 rounded-lg">
          {errorMessage}
        </div>
      )}

      {activeTab === "manage" && (
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
                    <td className="px-6 py-6 text-center text-gray-500" colSpan={7}>
                      <div className="flex items-center justify-center gap-3">
                        <div className="h-5 w-5 animate-spin rounded-full border-b-2 border-indigo-600"></div>
                        Đang tải danh sách đơn...
                      </div>
                    </td>
                  </tr>
                )}

                {!loadingForms && forms.length === 0 && (
                  <tr>
                    <td className="px-6 py-6 text-center text-gray-500" colSpan={7}>
                      Chưa có đơn nào cho bộ lọc hiện tại.
                    </td>
                  </tr>
                )}

                {!loadingForms &&
                  forms.map((form) => (
                    <tr
                      key={form.id}
                      className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                      onClick={() => navigate(`/forms/${form.id}`)}
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
      )}

      {activeTab === "create" && (
        <div className="flex gap-6">
          <div className="w-64 shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-6">
            <StudentSearch
              onSelect={(student) => {
                setSelectedStudent(student);
                setSelectedFormType(null);
              }}
              selectedStudent={selectedStudent}
            />

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">
                Loại đơn
              </h3>
              <div className="space-y-2">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedFormType(template.id)}
                    disabled={!selectedStudent}
                    className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                      selectedFormType === template.id
                        ? "bg-indigo-50 text-indigo-700 font-semibold border-2 border-indigo-200"
                        : selectedStudent
                        ? "bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-transparent"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-transparent"
                    }`}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
              {!selectedStudent && (
                <p className="text-xs text-gray-500 mt-2">
                  Vui lòng chọn học viên trước
                </p>
              )}
            </div>
          </div>

          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            {!selectedStudent ? (
              <div className="text-center py-12 text-gray-500">
                Vui lòng chọn học viên để bắt đầu tạo đơn
              </div>
            ) : selectedFormType === null ? (
              <div className="text-center py-12 text-gray-500">
                Vui lòng chọn loại đơn để bắt đầu tạo đơn
              </div>
            ) : (
              <FormRenderer
                templateId={selectedFormType}
                templates={templates}
                student={selectedStudent}
                onCancel={() => {
                  setSelectedFormType(null);
                  setSelectedStudent(null);
                }}
                onSuccess={() => {
                  setSelectedFormType(null);
                  setSelectedStudent(null);
                  setActiveTab("manage");
                  void loadForms();
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

