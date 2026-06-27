import { useCallback, useEffect, useMemo, useState } from "react";
import StudentSearch from "./StudentSearch";
import FormTransferClass from "./FormTransferClass";
import FormReservation from "./FormReservation";
import FormSuspension from "./FormSuspension";
import FormDropout from "./FormDropout";
import studentFormApi from "../../services/formApi";
import type { User } from "../../services/userApi";
import type {
  FormTemplate,
  StudentFormCreateDTO,
  StudentFormResponse,
} from "../../types/form";
import type { StudentEnrollmentInfo } from "../../utils/studentEnrollment";

interface StudentFormCreatePanelProps {
  templates: FormTemplate[];
  initialStudent?: User | null;
  hideStudentSearch?: boolean;
  onFormSuccess?: () => void;
  onFormCancel?: () => void;
  enrollmentInfo?: StudentEnrollmentInfo | null;
}

interface FormRendererProps {
  templateId: number;
  templates: FormTemplate[];
  student: User;
  onCancel: () => void;
  onSuccess: () => void;
  enrollmentInfo?: StudentEnrollmentInfo | null;
}

type FormSubmissionData = Partial<{
  classId: number;
  fullName: string;
  phoneNumber: string;
  email: string;
  reason: string;
  startDate: string;
  endDate: string;
  decisionDate: string;
  withdrawalDate: string;
  targetClassId: number;
  targetProgramType: string;
}>;

function FormRenderer({
  templateId,
  templates,
  student,
  onCancel,
  onSuccess,
  enrollmentInfo,
}: FormRendererProps) {
  const template = templates.find((t) => t.id === templateId);

  const handleSubmit = async (formData: FormSubmissionData) => {
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
        startDate: formData.startDate || formData.decisionDate || formData.withdrawalDate,
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
    enrollment: enrollmentInfo ?? null,
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

const DROPOUT_TEMPLATE_CODE = "DROPOUT";

export default function StudentFormCreatePanel({
  templates,
  initialStudent = null,
  hideStudentSearch = false,
  onFormCancel,
  onFormSuccess,
  enrollmentInfo = null,
}: StudentFormCreatePanelProps) {
  const [selectedStudent, setSelectedStudent] = useState<User | null>(initialStudent);
  const [selectedFormType, setSelectedFormType] = useState<number | null>(null);
  const [studentDropoutExists, setStudentDropoutExists] = useState(false);
  const [checkingDropout, setCheckingDropout] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const templateMap = useMemo(() => {
    return new Map(templates.map((tpl) => [tpl.id, tpl]));
  }, [templates]);

  const fetchDropoutStatus = useCallback(
    async (student: User | null) => {
      if (!student) {
        setStudentDropoutExists(false);
        return;
      }

      try {
        setCheckingDropout(true);
        const allForms: StudentFormResponse[] = await studentFormApi.getForms();
        const hasDropout = allForms.some(
          (f) =>
            f.studentId === student.id &&
            f.templateName?.toLowerCase().includes("thôi học"),
        );
        setStudentDropoutExists(hasDropout);
      } catch (error) {
        console.error("Failed to check existing forms", error);
        setStudentDropoutExists(false);
      } finally {
        setCheckingDropout(false);
      }
    },
    [],
  );

  useEffect(() => {
    setSelectedStudent(initialStudent);
    setSelectedFormType(null);
    void fetchDropoutStatus(initialStudent ?? null);
  }, [initialStudent?.id, initialStudent, fetchDropoutStatus]);

  const handleStudentSelect = async (student: User | null) => {
    setSelectedStudent(student);
    setSelectedFormType(null);
    await fetchDropoutStatus(student);
  };

  const handleFormCancel = () => {
    setSelectedFormType(null);
    if (!hideStudentSearch) {
      setSelectedStudent(null);
    }
    onFormCancel?.();
  };

  const handleFormSuccess = () => {
    setSelectedFormType(null);
    if (!hideStudentSearch) {
      setSelectedStudent(null);
    }
    onFormSuccess?.();
  };

  const renderStudentInfo = () => {
    if (!selectedStudent) {
      return (
        <div className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
          Chưa chọn học viên
        </div>
      );
    }

    const fullName =
      `${selectedStudent.lastName || ""} ${selectedStudent.firstName || ""}`.trim() ||
      selectedStudent.username;

    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-900">{fullName}</p>
        <p className="text-xs text-gray-500">{selectedStudent.email}</p>
        {selectedStudent.phoneNumber && (
          <p className="text-xs text-gray-500 mt-1">{selectedStudent.phoneNumber}</p>
        )}
      </div>
    );
  };

  const formRendererVisible =
    Boolean(selectedStudent) && typeof selectedFormType === "number" && templateMap.has(selectedFormType);

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="w-full lg:w-64 shrink-0 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-4">
          {!hideStudentSearch ? (
            <StudentSearch
              onSelect={handleStudentSelect}
              selectedStudent={selectedStudent}
              onError={(message?: string) => setErrorMessage(message || null)}
            />
          ) : (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-2">Học viên</p>
              {renderStudentInfo()}
            </div>
          )}

          {checkingDropout && (
            <p className="text-xs text-teal-700 flex items-center gap-2">
              <span className="h-3 w-3 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
              Đang kiểm tra đơn thôi học
            </p>
          )}
          {errorMessage && (
            <p className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Loại đơn</h3>
          <div className="space-y-2">
            {templates.map((template) => {
              const isDropout = template.code === DROPOUT_TEMPLATE_CODE;
              const isDisabled =
                !selectedStudent || (isDropout && studentDropoutExists);
              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => {
                    if (isDropout && studentDropoutExists) {
                      alert(
                        "Học viên này đã có đơn thôi học. Không thể tạo thêm đơn thôi học cho cùng một học viên.",
                      );
                      return;
                    }
                    setSelectedFormType(template.id);
                  }}
                  disabled={isDisabled}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                    selectedFormType === template.id
                      ? "bg-teal-50 text-teal-700 font-semibold border-2 border-teal-200"
                      : isDisabled
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border-2 border-transparent"
                      : "bg-gray-50 text-gray-700 hover:bg-gray-100 border-2 border-transparent"
                  }`}
                >
                  {template.name}
                  {isDropout && studentDropoutExists && (
                    <span className="block text-xs text-red-500 mt-1">
                      Đã tồn tại đơn thôi học
                    </span>
                  )}
                </button>
              );
            })}
            {templates.length === 0 && (
              <p className="text-xs text-gray-500">Chưa có mẫu đơn khả dụng.</p>
            )}
          </div>
          {!selectedStudent && (
            <p className="text-xs text-gray-500 mt-2">
              Vui lòng chọn học viên trước
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[320px]">
        {!selectedStudent ? (
          <div className="text-center py-12 text-gray-500">
            Vui lòng chọn học viên để bắt đầu tạo đơn
          </div>
        ) : selectedFormType === null ? (
          <div className="text-center py-12 text-gray-500">
            Vui lòng chọn loại đơn để bắt đầu tạo đơn
          </div>
        ) : formRendererVisible ? (
          <FormRenderer
            templateId={selectedFormType}
            templates={templates}
            student={selectedStudent}
            onCancel={handleFormCancel}
            onSuccess={handleFormSuccess}
            enrollmentInfo={enrollmentInfo}
          />
        ) : (
          <div className="text-center py-12 text-gray-500">
            Không tìm thấy thông tin mẫu đơn. Vui lòng chọn lại loại đơn.
          </div>
        )}
      </div>
    </div>
  );
}

