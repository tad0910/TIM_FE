import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { TrashIcon, PencilIcon, PlusIcon } from "@heroicons/react/24/outline";
import { Search } from "lucide-react";
import NotificationPopup from "../../components/NotificationPopup";
import TableSkeleton from "../../components/TableSkeleton";
import Pagination from "../../components/Pagination";
import { useNotification } from "../../hooks/useNotification";
import {
  useBehaviorGroupsList,
  useDeleteBehaviorMutation,
  useAllBehaviorGroups,
  useCreateBehaviorMutation,
  useUpdateBehaviorMutation,
} from "../../hooks/api/useBehaviorGroups";
import { useAdminHeader } from "../../components/admin/layout/AdminShell";
import { getBehaviorActivation, removeBehaviorActivation, setBehaviorActivation } from "../../utils/behaviorSettings";
import { getAllPointTypes, getNotificationTemplates } from "../../services/gamificationApi";
import type {
  GamificationBehavior,
  GamificationBehaviorGroup,
  BehaviorFrequencyType,
  BehaviorPointType,
  GamificationPointType,
  NotificationTemplate,
} from "../../services/gamificationApi";

type BehaviorFormState = {
  groupId: number;
  name: string;
  frequencyType: BehaviorFrequencyType;
  maxTimesPerFrequency?: number;
  pointDiligence: number;
  pointCompetence: number;
  pointExperience: number;
};

const createDefaultBehaviorForm = (groupId: number = 0): BehaviorFormState => ({
  groupId,
  name: "",
  frequencyType: "UNLIMITED",
  maxTimesPerFrequency: 1,
  pointDiligence: 0,
  pointCompetence: 0,
  pointExperience: 0,
});

const PAGE_SIZE_OPTIONS = [10, 20, 50];

const frequencyLabelMap: Record<string, string> = {
  UNLIMITED: "Không giới hạn",
  DAILY: "Hàng ngày",
  WEEKLY: "Hàng tuần",
  MONTHLY: "Hàng tháng",
  YEARLY: "Hàng năm",
  ONCE: "Một lần",
};

export default function BehaviorListPage() {
  const { notification, showError, showSuccess, hideNotification } = useNotification();
  const { updateHeader, resetHeader } = useAdminHeader();
  const [searchParams, setSearchParams] = useSearchParams();

  const pageParam = Number(searchParams.get("page"));
  const sizeParam = Number(searchParams.get("size"));
  const queryParam = searchParams.get("q") ?? "";

  const page = Number.isFinite(pageParam) && pageParam >= 0 ? pageParam : 0;
  const pageSize = PAGE_SIZE_OPTIONS.includes(sizeParam) ? sizeParam : PAGE_SIZE_OPTIONS[0];

  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: "Hành vi", path: "/admin/gamification/behaviors" },
    { label: "Nhóm hành vi", path: "/admin/gamification/behaviors/groups" },
  ];

  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [deleteBehaviorTarget, setDeleteBehaviorTarget] = useState<GamificationBehavior | null>(null);
  const [localRefresh, setLocalRefresh] = useState(0);

  const [isCreateBehavior, setIsCreateBehavior] = useState(false);
  const [editingBehavior, setEditingBehavior] = useState<GamificationBehavior | null>(null);
  const [behaviorForm, setBehaviorForm] = useState<BehaviorFormState>(createDefaultBehaviorForm());
  const [isActive, setIsActive] = useState(true);
  const [pointTypes, setPointTypes] = useState<GamificationPointType[]>([]);
  const [notificationTemplates, setNotificationTemplates] = useState<NotificationTemplate[]>([]);
  const [behaviorPointTypes, setBehaviorPointTypes] = useState<BehaviorPointType[]>([]);
  const [pointTypeSelections, setPointTypeSelections] = useState<Record<number, { checked: boolean; points: string; notificationTemplateId?: string }>>({});

  useEffect(() => {
    updateHeader({
      title: "Quản lý hành vi",
      breadcrumbs: [
        { label: "Quản trị", href: "/admin/dashboard" },
        { label: "Gamification", href: "/admin/gamification" },
        { label: "Hành vi" },
      ],
    });
    return () => resetHeader();
  }, [resetHeader, updateHeader]);

  const { data, isLoading, isFetching } = useBehaviorGroupsList({ page, size: pageSize });
  const list = data?.content ?? [];
  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;

  const { data: allGroups } = useAllBehaviorGroups();

  const createBehaviorMutation = useCreateBehaviorMutation({
    onSuccess: () => {
      showSuccess("Thành công", "Đã tạo hành vi");
      setIsCreateBehavior(false);
      setBehaviorForm(createDefaultBehaviorForm(allGroups && allGroups.length > 0 ? allGroups[0].id : 0));
    },
    onError: (error) => {
      showError("Lỗi", (error as Error).message || "Không thể tạo hành vi");
    },
  });

  const updateBehaviorMutation = useUpdateBehaviorMutation({
    onSuccess: () => {
      showSuccess("Thành công", "Đã cập nhật hành vi");
      setEditingBehavior(null);
      setIsCreateBehavior(false);
      setBehaviorForm({
        groupId: 0,
        name: "",
        frequencyType: "UNLIMITED",
        pointDiligence: 0,
        pointCompetence: 0,
        pointExperience: 0,
      });
    },
    onError: (error) => {
      showError("Lỗi", (error as Error).message || "Không thể cập nhật hành vi");
    },
  });

  useEffect(() => {
    getAllPointTypes()
      .then((types) => setPointTypes(types))
      .catch((error) => console.error("Failed to load point types", error));
    getNotificationTemplates()
      .then((templates) => setNotificationTemplates(templates))
      .catch((error) => console.error("Failed to load notification templates", error));
  }, []);

  useEffect(() => {
    if (pointTypes.length === 0) return;
    setPointTypeSelections((prev) => {
      const next: Record<number, { checked: boolean; points: string; notificationTemplateId?: string }> = {};
      pointTypes.forEach((pt) => {
        next[pt.id] = prev[pt.id] || { checked: false, points: "" };
      });
      return next;
    });
  }, [pointTypes]);

  useEffect(() => {
    const selected: BehaviorPointType[] = [];
    Object.entries(pointTypeSelections).forEach(([id, value]) => {
      const pointTypeId = Number(id);
      if (!value?.checked) return;
      if (value.points === "") return;
      const parsedPoints = Number(value.points);
      if (Number.isNaN(parsedPoints)) return;
      selected.push({
        pointTypeId,
        points: parsedPoints,
        notificationTemplateId: value.notificationTemplateId ? Number(value.notificationTemplateId) : undefined,
      });
    });
    setBehaviorPointTypes(selected);
  }, [pointTypeSelections]);

  const handleOpenCreateBehavior = () => {
    const defaultGroupId = allGroups && allGroups.length > 0 ? allGroups[0].id : 0;
    setEditingBehavior(null);
    setBehaviorForm(createDefaultBehaviorForm(defaultGroupId));
    setIsActive(true);
    setPointTypeSelections((prev) => {
      const next: Record<number, { checked: boolean; points: string; notificationTemplateId?: string }> = {};
      Object.keys(prev).forEach((key) => {
        next[Number(key)] = { checked: false, points: "" };
      });
      return next;
    });
    setIsCreateBehavior(true);
  };

  const handleOpenEditBehavior = (behavior: GamificationBehavior) => {
    setEditingBehavior(behavior);
    setBehaviorForm({
      groupId: behavior.groupId,
      name: behavior.name,
      frequencyType: behavior.frequencyType,
      maxTimesPerFrequency: behavior.maxTimesPerFrequency,
      pointDiligence: behavior.pointDiligence ?? 0,
      pointCompetence: behavior.pointCompetence ?? 0,
      pointExperience: behavior.pointExperience ?? 0,
    });
    setIsActive(getBehaviorActivation(behavior.id, true));
    const selections: Record<number, { checked: boolean; points: string; notificationTemplateId?: string }> = {};
    pointTypes.forEach((pt) => {
      selections[pt.id] = { checked: false, points: "" };
    });
    (behavior.behaviorPointTypes || []).forEach((bpt) => {
      selections[bpt.pointTypeId] = {
        checked: true,
        points: bpt.points?.toString() ?? "",
        notificationTemplateId: bpt.notificationTemplateId?.toString(),
      };
    });
    setPointTypeSelections(selections);
    setIsCreateBehavior(true);
  };

  const handleSubmitBehavior = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!behaviorForm.name.trim()) {
      showError("Lỗi", "Vui lòng nhập tên hành vi");
      return;
    }

    const payload: any = {
      groupId: behaviorForm.groupId,
      name: behaviorForm.name.trim(),
      frequencyType: behaviorForm.frequencyType,
      maxTimesPerFrequency: behaviorForm.maxTimesPerFrequency,
      pointDiligence: behaviorForm.pointDiligence,
      pointCompetence: behaviorForm.pointCompetence,
      pointExperience: behaviorForm.pointExperience,
      behaviorPointTypes,
    };

    if (editingBehavior) {
      updateBehaviorMutation.mutate({ id: editingBehavior.id, data: payload });
    } else {
      createBehaviorMutation.mutate(payload, {
        onSuccess: (created) => {
          setBehaviorActivation(created.id, isActive);
        },
      });
    }
  };

  const deleteBehaviorMutation = useDeleteBehaviorMutation({
    onSuccess: () => {
      showSuccess("Thành công", "Đã xóa hành vi");
      setDeleteBehaviorTarget(null);
    },
    onError: (error) => {
      showError("Lỗi", (error as Error).message || "Không thể xóa hành vi");
    },
  });

  const filteredGroups = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return list;

    return list
      .map((group) => {
        const groupMatch = group.name.toLowerCase().includes(keyword);
        const matchingBehaviors = (group.behaviors || []).filter((b) =>
          b.name.toLowerCase().includes(keyword)
        );

        if (groupMatch) {
          return group;
        }

        if (matchingBehaviors.length > 0) {
          return { ...group, behaviors: matchingBehaviors };
        }

        return null;
      })
      .filter(Boolean) as GamificationBehaviorGroup[];
  }, [list, searchTerm]);

  const activationMap = useMemo(() => {
    const map: Record<number, boolean> = {};
    list.forEach((group) => {
      group.behaviors?.forEach((behavior) => {
        map[behavior.id] = getBehaviorActivation(behavior.id, true);
      });
    });
    return map;
  }, [list, localRefresh]);

  const handleToggleActivation = (behaviorId: number, currentStatus: boolean) => {
    setBehaviorActivation(behaviorId, !currentStatus);
    setLocalRefresh((prev) => prev + 1);
  };

  const changeParams = useCallback(
    (newParams: Record<string, string | number>) => {
      const params = new URLSearchParams(searchParams);
      Object.entries(newParams).forEach(([key, value]) => {
        params.set(key, String(value));
      });
      setSearchParams(params, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      changeParams({ page: nextPage });
    },
    [changeParams],
  );

  const handlePageSizeChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const nextSize = Number(event.target.value);
      changeParams({ size: nextSize, page: 0 });
    },
    [changeParams],
  );

  const handleSearchSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      changeParams({ q: searchTerm, page: 0 });
    },
    [changeParams, searchTerm],
  );

  const handleOpenDeleteBehavior = (behaviorId: number) => {
    const behavior = list
      .flatMap((group) => group.behaviors ?? [])
      .find((item) => item.id === behaviorId);
    if (behavior) setDeleteBehaviorTarget(behavior);
  };

  const handleConfirmDeleteBehavior = () => {
    if (!deleteBehaviorTarget || deleteBehaviorMutation.isPending) return;
    deleteBehaviorMutation.mutate({ id: deleteBehaviorTarget.id });
    removeBehaviorActivation(deleteBehaviorTarget.id);
  };

  const behaviorColumns = [
    {
      label: "Số thứ tự",
      className: "w-24 text-center",
    },
    {
      label: "Hành vi",
      className: "text-left w-[26rem]",
    },
    {
      label: "Kích hoạt",
      className: "text-center w-24",
    },
    {
      label: "Chuyên cần",
      className: "text-center w-20",
    },
    {
      label: "Năng lực",
      className: "text-center w-20",
    },
    {
      label: "Kinh nghiệm",
      className: "text-center w-20",
    },
    {
      label: "Tần suất",
      className: "text-left w-40",
    },
    {
      label: "Thao tác",
      className: "text-right w-20",
    },
  ];

  if (isLoading && !data) {
    return (
      <div className="space-y-6">
        <TableSkeleton rows={5} columns={behaviorColumns.length} />
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
                  if (!isActive) {
                    navigate(item.path);
                  }
                }}
                className={`inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-teal-50 text-teal-600"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72 lg:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm kiếm hành vi hoặc nhóm"
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button type="submit" className="hidden" aria-hidden="true" />
          </form>
          <button
            type="button"
            onClick={handleOpenCreateBehavior}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
          >
            <PlusIcon className="h-5 w-5" />
            Thêm hành vi
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">Kích thước trang</span>
              <select
                value={pageSize}
                onChange={handlePageSizeChange}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {PAGE_SIZE_OPTIONS.map((sizeOption) => (
                  <option key={sizeOption} value={sizeOption}>
                    {sizeOption}
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
              itemName="hành vi"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full table-fixed divide-y divide-slate-100">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <tr>
                {behaviorColumns.map((column) => (
                  <th key={column.label} className={`px-5 py-3 ${column.className || ""}`}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={behaviorColumns.length} className="px-5 py-10 text-center text-slate-500">
                    Không tìm thấy hành vi phù hợp
                  </td>
                </tr>
              ) : (
                filteredGroups.map((group, groupIndex) => (
                  <Fragment key={group.id}>
                    <tr className="bg-slate-50/50">
                      <td colSpan={behaviorColumns.length} className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-600">
                            {groupIndex + 1 + page * pageSize}
                          </span>
                          <span className="font-bold text-slate-800 uppercase text-xs tracking-wider">
                            Nhóm hành vi
                          </span>
                          <span className="font-semibold text-slate-900 text-base">
                            {group.name}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {(group.behaviors || []).map((behavior, behaviorIndex) => {
                      const active = activationMap[behavior.id] ?? true;
                      return (
                        <tr key={behavior.id} className="hover:bg-slate-50">
                          <td className="px-5 py-4 text-center text-slate-500 font-medium">
                            {groupIndex + 1 + page * pageSize}.{behaviorIndex + 1}
                          </td>
                          <td className="px-5 py-4 font-medium text-slate-800 break-words">
                            {behavior.name}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleActivation(behavior.id, active)}
                              className={`inline-flex cursor-pointer items-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-colors ${
                                active
                                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              }`}
                            >
                              {active ? "ON" : "OFF"}
                            </button>
                          </td>
                          <td className="px-5 py-4 text-center text-slate-600">
                            {behavior.pointDiligence ?? 0}
                          </td>
                          <td className="px-5 py-4 text-center text-slate-600">
                            {behavior.pointCompetence ?? 0}
                          </td>
                          <td className="px-5 py-4 text-center text-slate-600">
                            {behavior.pointExperience ?? 0}
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-0.5 text-xs">
                              <span className="font-medium text-slate-700">
                                {frequencyLabelMap[behavior.frequencyType]}
                              </span>
                              {behavior.maxTimesPerFrequency && (
                                <span className="text-slate-500">
                                  Số lượng: {behavior.maxTimesPerFrequency}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => handleOpenEditBehavior(behavior)}
                                className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
                                title="Sửa hành vi"
                              >
                                <PencilIcon className="h-4 w-4" />
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenDeleteBehavior(behavior.id)}
                                className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 px-2 py-1.5 text-sm text-rose-600 transition-colors hover:bg-rose-100"
                                title="Xóa hành vi"
                              >
                                <TrashIcon className="h-4 w-4" />
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
        <footer className="flex flex-wrap items-center justify-between border-t border-slate-200 px-6 py-4 text-sm text-slate-600">
          <span>
            Hiển thị {Math.min((page + 1) * pageSize, totalElements)} / {totalElements} hành vi
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => handlePageChange(Math.max(page - 1, 0))}
              disabled={page === 0}
            >
              Trước
            </button>
            <span>
              Trang {totalPages === 0 ? 0 : page + 1} / {totalPages || 1}
            </span>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => handlePageChange(page + 1 < totalPages ? page + 1 : page)}
              disabled={page + 1 >= totalPages}
            >
              Sau
            </button>
          </div>
        </footer>
      </section>

      <NotificationPopup notification={notification} onClose={hideNotification} />

      <Transition show={Boolean(deleteBehaviorTarget)} as={Fragment}>
        <Dialog onClose={() => setDeleteBehaviorTarget(null)} className="relative z-50">
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
                <DialogTitle className="text-lg font-semibold text-slate-900">Xóa hành vi</DialogTitle>
                <p className="mt-3 text-sm text-slate-600">
                  Bạn có chắc chắn muốn xóa hành vi
                  {" "}
                  <span className="font-semibold text-slate-900">{deleteBehaviorTarget?.name}</span>
                  ? Thao tác này không thể hoàn tác.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setDeleteBehaviorTarget(null)}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    disabled={deleteBehaviorMutation.isPending}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteBehavior}
                    className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-rose-700 disabled:opacity-60"
                    disabled={deleteBehaviorMutation.isPending}
                  >
                    {deleteBehaviorMutation.isPending ? "Đang xóa..." : "Xóa"}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>

      <Transition show={isCreateBehavior} as={Fragment}>
        <Dialog
          onClose={() => {
            setIsCreateBehavior(false);
            setEditingBehavior(null);
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
              <DialogPanel className="w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="border-b border-slate-100 px-6 py-4">
                  <DialogTitle className="text-lg font-semibold text-slate-900">
                    {editingBehavior ? "Sửa hành vi" : "Thêm hành vi mới"}
                  </DialogTitle>
                </div>
                <form onSubmit={handleSubmitBehavior} className="flex max-h-[75vh] flex-col">
                  <div className="flex-1 space-y-4 overflow-y-auto px-6 pb-6 pt-4">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-slate-700">Tên hành vi <span className="text-red-500">*</span></span>
                        <input
                          type="text"
                          required
                          value={behaviorForm.name}
                          onChange={(e) => setBehaviorForm({ ...behaviorForm, name: e.target.value })}
                          className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Nhập tên hành vi"
                        />
                      </label>

                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-slate-700">Nhóm hành vi <span className="text-red-500">*</span></span>
                        <select
                          value={behaviorForm.groupId}
                          onChange={(e) => setBehaviorForm({ ...behaviorForm, groupId: Number(e.target.value) })}
                          className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value={0} disabled>Chọn nhóm</option>
                          {allGroups?.map((group) => (
                            <option key={group.id} value={group.id}>
                              {group.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-slate-700">Tần suất <span className="text-red-500">*</span></span>
                        <select
                          value={behaviorForm.frequencyType}
                          onChange={(e) => setBehaviorForm({ ...behaviorForm, frequencyType: e.target.value as BehaviorFrequencyType })}
                          className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                          {Object.entries(frequencyLabelMap).map(([key, label]) => (
                            <option key={key} value={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-slate-700">Số lần tối đa (trong kỳ)</span>
                        <input
                          type="number"
                          min="0"
                          value={behaviorForm.maxTimesPerFrequency ?? ""}
                          onChange={(e) => {
                            const val = e.target.value === "" ? undefined : Number(e.target.value);
                            setBehaviorForm({ ...behaviorForm, maxTimesPerFrequency: val });
                          }}
                          className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="Không giới hạn"
                        />
                        <p className="text-xs text-slate-500">Để trống nếu không giới hạn số lần</p>
                      </label>
                    </div>

                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-slate-900">Kích hoạt hành vi</h4>
                            <p className="text-xs text-slate-500">Bật để hành vi có hiệu lực ngay sau khi lưu</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setIsActive(true)}
                              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                                isActive ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              ON
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsActive(false)}
                              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                                !isActive ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              OFF
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-3">
                        <h4 className="text-sm font-semibold text-slate-900">Điểm Diligence/Năng lực/Kinh nghiệm (legacy)</h4>
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <label className="space-y-2 text-sm">
                            <span className="font-medium text-slate-700">Điểm Chuyên cần</span>
                            <input
                              type="number"
                              value={behaviorForm.pointDiligence}
                              onChange={(event) => setBehaviorForm({ ...behaviorForm, pointDiligence: Number(event.target.value) })}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </label>

                          <label className="space-y-2 text-sm">
                            <span className="font-medium text-slate-700">Điểm Năng lực</span>
                            <input
                              type="number"
                              value={behaviorForm.pointCompetence}
                              onChange={(event) => setBehaviorForm({ ...behaviorForm, pointCompetence: Number(event.target.value) })}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </label>

                          <label className="space-y-2 text-sm sm:col-span-2 lg:col-span-1">
                            <span className="font-medium text-slate-700">Điểm Kinh nghiệm</span>
                            <input
                              type="number"
                              value={behaviorForm.pointExperience}
                              onChange={(event) => setBehaviorForm({ ...behaviorForm, pointExperience: Number(event.target.value) })}
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="mb-4 flex flex-col gap-1">
                        <h4 className="text-sm font-semibold text-slate-900">Điểm thưởng theo loại</h4>
                        <p className="text-xs text-slate-500">Bật các loại điểm áp dụng và nhập số điểm kèm thông báo riêng</p>
                      </div>
                      {pointTypes.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                          Chưa có loại điểm thưởng. Vui lòng tạo trong phần cấu hình điểm trước.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {pointTypes.map((pointType) => {
                            const selection = pointTypeSelections[pointType.id] || { checked: false, points: "" };
                            return (
                              <div
                                key={pointType.id}
                                className={`rounded-xl border-2 p-3 transition ${
                                  selection.checked ? "border-teal-200 bg-white" : "border-transparent bg-white"
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <input
                                    type="checkbox"
                                    checked={selection.checked}
                                    onChange={(event) =>
                                      setPointTypeSelections((prev) => ({
                                        ...prev,
                                        [pointType.id]: {
                                          checked: event.target.checked,
                                          points: event.target.checked ? selection.points : "",
                                          notificationTemplateId: event.target.checked ? selection.notificationTemplateId : undefined,
                                        },
                                      }))
                                    }
                                    className="mt-1 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                                  />
                                  <div className="flex-1 space-y-3">
                                    <div>
                                      <p className="text-sm font-semibold text-slate-900">{pointType.name}</p>
                                      {pointType.description && (
                                        <p className="text-xs text-slate-500">{pointType.description}</p>
                                      )}
                                    </div>
                                    {selection.checked && (
                                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                                        <label className="space-y-2 text-xs font-medium text-slate-600">
                                          <span>Số điểm <span className="text-red-500">*</span></span>
                                          <input
                                            type="number"
                                            min="0"
                                            value={selection.points}
                                            onChange={(event) =>
                                              setPointTypeSelections((prev) => ({
                                                ...prev,
                                                [pointType.id]: {
                                                  ...selection,
                                                  points: event.target.value,
                                                },
                                              }))
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            placeholder="VD: 50"
                                          />
                                        </label>
                                        <label className="sm:col-span-2 space-y-2 text-xs font-medium text-slate-600">
                                          <span>Thông báo</span>
                                          <select
                                            value={selection.notificationTemplateId ?? ""}
                                            onChange={(event) =>
                                              setPointTypeSelections((prev) => ({
                                                ...prev,
                                                [pointType.id]: {
                                                  ...selection,
                                                  notificationTemplateId: event.target.value || undefined,
                                                },
                                              }))
                                            }
                                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                          >
                                            <option value="">Thông báo mặc định</option>
                                            {notificationTemplates.map((template) => (
                                              <option key={template.id} value={template.id}>
                                                {template.name}
                                              </option>
                                            ))}
                                          </select>
                                        </label>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreateBehavior(false);
                        setEditingBehavior(null);
                      }}
                      className="rounded-full border border-slate-200 px-5 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      Huỷ
                    </button>
                    <button
                      type="submit"
                      className="rounded-full bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow transition hover:bg-teal-700"
                      disabled={createBehaviorMutation.isPending || updateBehaviorMutation.isPending}
                    >
                      {createBehaviorMutation.isPending || updateBehaviorMutation.isPending ? "Đang lưu..." : editingBehavior ? "Cập nhật" : "Tạo hành vi"}
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
