import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import AdminPageHeader from "../../components/AdminPageHeader";
import NotificationPopup from "../../components/NotificationPopup";
import { useNotification } from "../../hooks/useNotification";
import {
  getNotificationTemplateById,
} from "../../services/gamificationApi";
import { useNotificationTemplatesStore } from "../../store/useNotificationTemplatesStore";

type FormState = {
  name: string;
  title: string;
  content: string;
};

export default function CreateNotificationTemplatePage() {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId?: string }>();
  const isEditing = Boolean(templateId);
  const [form, setForm] = useState<FormState>({
    name: "",
    title: "",
    content: "",
  });
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [existingIconUrl, setExistingIconUrl] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const { notification, hideNotification, showError, showSuccess, showApiError } =
    useNotification();
  const { addTemplate, updateTemplate } = useNotificationTemplatesStore();

  useEffect(() => {
    if (!isEditing || !templateId) return;

    const fetchDetail = async () => {
      try {
        setLoading(true);
        const data = await getNotificationTemplateById(Number(templateId));
        setForm({
          name: data.name || "",
          title: data.title || "",
          content: data.content || "",
        });
        setExistingIconUrl(data.iconUrl || "");
      } catch (error) {
        console.error("Failed to load notification template", error);
        showApiError(error, "Không thể tải thông tin thông báo");
        navigate("/admin/gamification/notifications");
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [isEditing, templateId, navigate, showApiError]);

  const handleInputChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.title.trim() || !form.content.trim()) {
      showError("Lỗi", "Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }

    const payload = {
      name: form.name.trim(),
      title: form.title.trim(),
      content: form.content.trim(),
      iconUrl: !iconFile && existingIconUrl ? existingIconUrl : undefined,
    };

    try {
      setSubmitting(true);
      if (isEditing && templateId) {
        await updateTemplate(Number(templateId), payload, iconFile || undefined);
        showSuccess("Thành công", "Đã cập nhật thông báo");
      } else {
        await addTemplate(payload, iconFile || undefined);
        showSuccess("Thành công", "Đã tạo thông báo");
      }
      setTimeout(() => navigate("/admin/gamification/notifications"), 2000);
    } catch (error) {
      console.error("Failed to submit notification template", error);
      showError("Lỗi", "Không thể lưu thông báo");
    } finally {
      setSubmitting(false);
    }
  };

  const breadcrumbs = [
    { label: "Quản trị", onClick: () => navigate("/admin/dashboard") },
    { label: "Gamification", onClick: () => navigate("/admin/gamification") },
    { label: "Thông báo", onClick: () => navigate("/admin/gamification/notifications") },
    { label: isEditing ? "Chỉnh sửa thông báo" : "Tạo thông báo", active: true },
  ];

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={breadcrumbs}
        title={isEditing ? "Chỉnh sửa thông báo" : "Tạo thông báo"}
      />

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={() => navigate("/admin/gamification/notifications")}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          type="button"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Quay lại danh sách thông báo
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tên thông báo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Nhập tên thông báo"
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tiêu đề thông báo <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Nhập tiêu đề"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Icon
              </label>
              <div className="flex items-center gap-3">
                <label className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg border border-gray-300 cursor-pointer hover:bg-gray-200">
                  Chọn file
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIconChange}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
                <span className="text-sm text-gray-600">
                  {iconFile?.name || existingIconUrl || "Chưa có file nào được chọn"}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.content}
                onChange={(e) => handleInputChange("content", e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                placeholder="Nhập mô tả"
                disabled={loading}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate("/admin/gamification/notifications")}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              disabled={submitting}
            >
              Hủy thao tác
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              disabled={submitting}
            >
              {submitting ? "Đang lưu..." : isEditing ? "Cập nhật" : "Thêm mới"}
            </button>
          </div>
        </form>
      </div>

      {notification && (
        <NotificationPopup notification={notification} onClose={hideNotification} />
      )}
    </div>
  );
}

