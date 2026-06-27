import { Fragment, useEffect, useMemo, useState } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { PlusIcon, PencilIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Search as SearchIcon } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import NotificationPopup from "../../components/NotificationPopup";
import TableSkeleton from "../../components/TableSkeleton";
import Pagination from "../../components/Pagination";
import { useNotification } from "../../hooks/useNotification";
import { type GamificationBehaviorGroup, type UpdateBehaviorGroupRequest } from "../../services/gamificationApi";
import {
  insertGroupWithOrder,
  removeGroupFromOrder,
  sortGroupsByStoredOrder,
} from "../../utils/behaviorSettings";
import { useAdminHeader } from "../../components/admin/layout/AdminShell";
import {
  useBehaviorGroupsList,
  useCreateBehaviorGroupMutation,
  useUpdateBehaviorGroupMutation,
  useDeleteBehaviorGroupMutation,
} from "../../hooks/api/useBehaviorGroups";

const navItems = [
  { label: "Hành vi", path: "/admin/gamification/behaviors" },
  { label: "Nhóm hành vi", path: "/admin/gamification/behaviors/groups" },
];

const PAGE_SIZE_OPTIONS = [5, 10, 20];

export default function BehaviorGroupsListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { notification, showError, showSuccess, hideNotification } = useNotification();
  const { updateHeader, resetHeader } = useAdminHeader();

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState("");

  const { data, isLoading, isFetching } = useBehaviorGroupsList({ page, size: pageSize });

  useEffect(() => {
    updateHeader({
      title: "Nhóm hành vi",
      breadcrumbs: [
        { label: "Quản trị", href: "/admin/dashboard" },
        { label: "Gamification", href: "/admin/gamification" },
        { label: "Nhóm hành vi" },
      ],
    });

    return () => resetHeader();
  }, [resetHeader, updateHeader]);

  const groups = data?.content ?? [];
  const totalElements = data?.totalElements ?? groups.length;
  const totalPages = data?.totalPages ?? (groups.length ? Math.ceil(totalElements / pageSize) : 0);

  const orderedGroups = useMemo(() => {
    const filtered = searchTerm.trim()
      ? groups.filter((group) => group.name.toLowerCase().includes(searchTerm.trim().toLowerCase()))
      : groups;
    return sortGroupsByStoredOrder(filtered);
  }, [groups, searchTerm]);

  const [editTarget, setEditTarget] = useState<GamificationBehaviorGroup | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<GamificationBehaviorGroup | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDisplayOrder, setCreateDisplayOrder] = useState("1");

  const createGroupMutation = useCreateBehaviorGroupMutation();
  const updateGroupMutation = useUpdateBehaviorGroupMutation();
  const deleteGroupMutation = useDeleteBehaviorGroupMutation();

  const isCreating = createGroupMutation.isPending;
  const isUpdating = updateGroupMutation.isPending;
  const isDeleting = deleteGroupMutation.isPending;

  const handleOpenCreate = () => {
    setIsCreateOpen(true);
    setCreateName("");
    setCreateDisplayOrder(String(groups.length + 1));
  };

  const handleCloseCreate = () => {
    setIsCreateOpen(false);
    setCreateName("");
    setCreateDisplayOrder("1");
  };

  const handleOpenEdit = (group: GamificationBehaviorGroup) => {
    setEditTarget(group);
    setEditName(group.name);
  };

  const handleCloseEdit = () => {
    setEditTarget(null);
    setEditName("");
  };

  const handleSubmitCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createName.trim()) {
      showError("Lỗi", "Vui lòng nhập tên nhóm");
      return;
    }

    const desiredOrder = Number(createDisplayOrder);
    if (!Number.isFinite(desiredOrder) || desiredOrder < 1) {
      showError("Lỗi", "Thứ tự hiển thị phải là số tự nhiên >= 1");
      return;
    }

    createGroupMutation.mutate(
      { name: createName.trim() },
      {
        onSuccess: (created) => {
          insertGroupWithOrder(created.id, desiredOrder);
          showSuccess("Thành công", "Đã tạo nhóm hành vi mới");
          handleCloseCreate();
          setPage(0);
        },
        onError: (error) => {
          console.error("Failed to create behavior group", error);
          showError("Lỗi", "Không thể tạo nhóm hành vi");
        },
      },
    );
  };

  const handleSubmitEdit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editTarget) return;

    if (!editName.trim()) {
      showError("Lỗi", "Vui lòng nhập tên nhóm hành vi");
      return;
    }

    const payload: UpdateBehaviorGroupRequest = { name: editName.trim() };
    updateGroupMutation.mutate(
      { id: editTarget.id, data: payload },
      {
        onSuccess: () => {
          showSuccess("Thành công", "Đã cập nhật nhóm hành vi");
          handleCloseEdit();
        },
        onError: (error) => {
          console.error("Failed to update behavior group", error);
          showError("Lỗi", "Không thể cập nhật nhóm hành vi");
        },
      },
    );
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    deleteGroupMutation.mutate(
      { id: deleteTarget.id },
      {
        onSuccess: () => {
          removeGroupFromOrder(deleteTarget.id);
          showSuccess("Thành công", "Đã xóa nhóm hành vi");
          setDeleteTarget(null);
        },
        onError: (error) => {
          console.error("Failed to delete behavior group", error);
          showError("Lỗi", "Không thể xóa nhóm hành vi");
        },
      },
    );
  };

  const handlePageSizeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextSize = Number(event.target.value);
    setPageSize(nextSize);
    setPage(0);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= totalPages) return;
    setPage(nextPage);
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={5} columns={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 px-6 py-4" aria-label="Tabs">
          {navItems.map((item) => {
            const isActive = item.path === "/admin/gamification/behaviors"
              ? location.pathname.startsWith("/admin/gamification/behaviors")
              : location.pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  if (!isActive) navigate(item.path);
                }}
                className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-teal-50 text-teal-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl bg-white px-6 py-4 shadow-sm">
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-4">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setPage(0);
            }}
            className="relative w-full sm:w-72 lg:w-80"
          >
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm kiếm nhóm hành vi"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button type="submit" className="hidden" aria-hidden="true" />
          </form>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
          >
            <PlusIcon className="h-5 w-5" />
            Thêm nhóm hành vi
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            {isFetching ? 'Đang tải dữ liệu...' : `Tổng ${totalElements} nhóm`}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">Kích thước trang</span>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <Pagination
              currentPage={page}
              pageSize={pageSize}
              totalElements={totalElements}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              itemName="nhóm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed divide-y divide-slate-100">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="w-24 px-5 py-3 text-center">Số thứ tự</th>
                <th className="px-5 py-3">Tên nhóm hành vi</th>
                <th className="w-40 px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {orderedGroups.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-slate-500">
                    Chưa có nhóm hành vi
                  </td>
                </tr>
              ) : (
                orderedGroups.map((group, index) => (
                  <tr key={group.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4 text-center font-semibold text-slate-800">
                      {group.displayOrder ?? index + 1}
                    </td>
                    <td className="px-5 py-4 text-slate-800">{group.name}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(group)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60"
                          disabled={isUpdating || isDeleting}
                        >
                          <PencilIcon className="h-4 w-4" />
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(group)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-60"
                          disabled={isDeleting}
                        >
                          <TrashIcon className="h-4 w-4" />
                          Xóa
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Transition show={Boolean(deleteTarget)} as={Fragment}>
        <Dialog onClose={() => setDeleteTarget(null)} className="relative z-50">
          <TransitionChild
            enter="ease-out duration-200 transition-opacity"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150 transition-opacity"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/50" />
          </TransitionChild>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <TransitionChild
              enter="ease-out duration-200 transition-all"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150 transition-all"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <DialogTitle className="text-lg font-semibold text-slate-900">Xóa nhóm hành vi</DialogTitle>
                <p className="mt-3 text-sm text-slate-600">
                  Bạn có chắc muốn xóa nhóm
                  {' '}
                  <span className="font-semibold text-slate-900">{deleteTarget?.name}</span>
                  ? Hành vi bên trong sẽ cần phân loại lại.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(null)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
                    disabled={isDeleting}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-rose-700 disabled:opacity-60"
                    disabled={isDeleting}
                  >
                    {isDeleting ? 'Đang xóa...' : 'Xóa'}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>

      <Transition show={isCreateOpen || Boolean(editTarget)} as={Fragment}>
        <Dialog
          onClose={() => {
            handleCloseEdit();
            handleCloseCreate();
          }}
          className="relative z-50"
        >
          <TransitionChild
            enter="ease-out duration-200 transition-opacity"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150 transition-opacity"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/50" />
          </TransitionChild>
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <TransitionChild
              enter="ease-out duration-200 transition-all"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150 transition-all"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="border-b border-slate-100 px-6 py-4">
                  <DialogTitle className="text-lg font-semibold text-slate-900">
                    {editTarget ? 'Sửa nhóm hành vi' : 'Thêm nhóm hành vi'}
                  </DialogTitle>
                </div>
                <form
                  onSubmit={editTarget ? handleSubmitEdit : handleSubmitCreate}
                  className="space-y-5 px-6 py-6"
                >
                  <div className="space-y-2 text-sm">
                    <label className="font-medium text-slate-700">
                      Tên nhóm hành vi <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editTarget ? editName : createName}
                      onChange={(event) => (
                        editTarget ? setEditName(event.target.value) : setCreateName(event.target.value)
                      )}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      placeholder="Nhập tên nhóm hành vi"
                      required
                    />
                  </div>

                  {!editTarget && (
                    <div className="space-y-2 text-sm">
                      <label className="font-medium text-slate-700">Thứ tự hiển thị</label>
                      <input
                        type="number"
                        min={1}
                        value={createDisplayOrder}
                        onChange={(event) => setCreateDisplayOrder(event.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder={`Ví dụ: ${groups.length + 1}`}
                      />
                      <p className="text-xs text-slate-500">
                        Nếu nhập trùng thứ tự đã có ({groups.length} nhóm hiện tại), vị trí mới sẽ được chèn và các nhóm phía sau sẽ tự động đẩy xuống.
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseEdit();
                        handleCloseCreate();
                      }}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 disabled:opacity-60"
                      disabled={isUpdating || isCreating}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-teal-700 disabled:opacity-60"
                      disabled={isUpdating || isCreating}
                    >
                      {editTarget
                        ? isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'
                        : isCreating ? 'Đang tạo...' : 'Tạo nhóm'}
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>

      {notification && (
        <NotificationPopup notification={notification} onClose={hideNotification} />
      )}
    </div>
  );
}
