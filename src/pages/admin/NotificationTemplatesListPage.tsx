import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import AdminPageHeader from "../../components/AdminPageHeader";
import TableSkeleton from "../../components/TableSkeleton";
import NotificationPopup from "../../components/NotificationPopup";
import { useNotification } from "../../hooks/useNotification";
import {
  deleteNotificationTemplate,
  type NotificationTemplate,
} from "../../services/gamificationApi";
import { useNotificationTemplatesStore } from "../../store/useNotificationTemplatesStore";
import Pagination from "../../components/Pagination";

export default function NotificationTemplatesListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const {
    notification,
    hideNotification,
    showApiError,
    showError,
    showSuccess,
  } = useNotification();
  const {
    templates,
    loading,
    totalPages,
    totalElements,
    fetchTemplates,
    getPageData,
    removeTemplate,
  } = useNotificationTemplatesStore();

  useEffect(() => {
    const cached = getPageData(page, pageSize);
    if (cached) {
    }
    fetchTemplates(page, pageSize).catch((error) => {
      console.error("Failed to fetch notification templates", error);
      showApiError(error, "Không thể tải danh sách thông báo");
    });
  }, [fetchTemplates, page, pageSize, getPageData, showApiError]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchTemplates(newPage, pageSize).catch((error) => {
      console.error("Failed to fetch notification templates", error);
      showApiError(error, "Không thể tải danh sách thông báo");
    });
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value, 10);
    setPageSize(newSize);
    setPage(0);
    fetchTemplates(0, newSize).catch((error) => {
      console.error("Failed to fetch notification templates", error);
      showApiError(error, "Không thể tải danh sách thông báo");
    });
  };

  const handleDelete = async (id: number) => {
    const confirmed = window.confirm("Bạn chắc chắn muốn xóa thông báo này?");
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await deleteNotificationTemplate(id);
      showSuccess("Thành công", "Đã xóa thông báo");
      await removeTemplate(id);
    } catch (error) {
      console.error("Failed to delete notification template", error);
      showError("Lỗi", "Không thể xóa thông báo");
    } finally {
      setDeletingId(null);
    }
  };

  const renderIcon = (iconUrl?: string) => {
    if (!iconUrl) {
      return (
        <div className="h-12 w-12 bg-gray-200 rounded-lg flex items-center justify-center">
          <span className="text-gray-400 text-xs">No Icon</span>
        </div>
      );
    }
    return (
      <img
        src={iconUrl}
        alt="icon"
        className="h-12 w-12 object-cover rounded-lg"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.src = 'https://via.placeholder.com/48?text=No+Icon';
        }}
      />
    );
  };

  if (loading) {
    return (
      <div>
        <AdminPageHeader
          breadcrumbs={[
            { label: "Quản trị", onClick: () => navigate("/admin/dashboard") },
            { label: "Gamification", onClick: () => navigate("/admin/gamification") },
            { label: "Thông báo", active: true },
          ]}
          title="Danh sách thông báo"
        />
        <TableSkeleton rows={5} columns={6} />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        breadcrumbs={[
          { label: "Quản trị", onClick: () => navigate("/admin/dashboard") },
          { label: "Gamification", onClick: () => navigate("/admin/gamification") },
          { label: "Thông báo", active: true },
        ]}
        title="Danh sách thông báo"
        chips={[{ label: "Tổng số", value: totalElements, tone: "indigo" }]}
      />

      <div className="mt-6 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate("/admin/gamification/notifications/create")}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            type="button"
          >
            <PlusIcon className="w-5 h-5" />
            Tạo mới thông báo
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-700">Mỗi trang</span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {[5, 10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  STT
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tên
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tiêu đề
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Icon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mô tả
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {templates.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-4 text-center text-sm text-gray-500"
                  >
                    Chưa có thông báo nào
                  </td>
                </tr>
              ) : (
                templates.map((template, index) => (
                  <tr key={template.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {page * pageSize + index + 1}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {template.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {template.title}
                    </td>
                    <td className="px-6 py-4">
                      {renderIcon(template.iconUrl)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {template.content}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            navigate(`/admin/gamification/notifications/${template.id}/edit`)
                          }
                          className="text-indigo-600 hover:text-indigo-800"
                          type="button"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50"
                          disabled={deletingId === template.id}
                          type="button"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          itemName="thông báo"
        />
      </div>

      {notification && (
        <NotificationPopup notification={notification} onClose={hideNotification} />
      )}
    </div>
  );
}

