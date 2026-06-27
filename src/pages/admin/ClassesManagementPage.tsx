import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAdminHeader } from "../../components/admin/layout/AdminShell";
import NotificationPopup from "../../components/NotificationPopup";
import { useNotification } from "../../hooks/useNotification";

import {
  getAllClasses,
  deleteClass,
  type ClassDTO,
} from "../../services/classApi";
import { programApi } from "../../services/programApi";
import type { PageResponse } from "../../types/pagination";
import type { ClassInfo } from "../../types/class";
import ClassFormModal from "../../modules/class/components/ClassFormModal";

interface MappedClass extends ClassInfo {
  memberCount?: number;
  studentCount?: number;
  teacherCount?: number;
  programName?: string;
}

export default function ClassesManagementPage() {
  const { updateHeader, resetHeader } = useAdminHeader();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { notification, showSuccess, hideNotification, showApiError } = useNotification();

  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortKey, setSortKey] = useState<"id" | "className">("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [searchTerm, setSearchTerm] = useState("");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editTarget, setEditTarget] = useState<MappedClass | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MappedClass | null>(null);

  useEffect(() => {
    updateHeader({
      title: "Lớp học",
      breadcrumbs: [
        { label: "Admin", href: "/admin/dashboard" },
        { label: "Lớp học" },
      ],
    });
    return () => resetHeader();
  }, [resetHeader, updateHeader]);

  const classesQuery = useQuery<PageResponse<ClassDTO>>({
    queryKey: [
      "admin-classes",
      { page: currentPage, size: pageSize, sortKey, sortDir, keyword: searchTerm.trim() },
    ],
    queryFn: () =>
      getAllClasses(currentPage, pageSize, `${sortKey},${sortDir}`),
    placeholderData: (previousData) => previousData,
  });

  const programsQuery = useQuery({
    queryKey: ["admin-programs", "all"],
    queryFn: () => programApi.getAllProgramsAsArray(),
    staleTime: 60_000,
  });

  const programMap = useMemo(() => {
    const map = new Map<number, string>();
    programsQuery.data?.forEach((program) => {
      map.set(program.id, program.name);
    });
    return map;
  }, [programsQuery.data]);

  const mappedClasses: MappedClass[] = useMemo(() => {
    const toNumber = (value: unknown) => {
      if (typeof value === "number" && Number.isFinite(value)) return value;
      if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    };

    const deriveCountFromMembers = (members?: ClassDTO["members"], role?: "sinh_vien" | "giao_vien") => {
      if (!Array.isArray(members)) return undefined;
      if (!role) return members.length;
      return members.filter((m) => (m.role || "").toLowerCase() === role).length;
    };

    return (
      classesQuery.data?.content?.map((dto, index) => {
        const teacherCount =
          toNumber((dto as any).teacherCount) ??
          toNumber((dto as any).teachersCount) ??
          deriveCountFromMembers(dto.members, "giao_vien");
        const studentCount =
          toNumber((dto as any).studentCount) ??
          toNumber((dto as any).studentsCount) ??
          deriveCountFromMembers(dto.members, "sinh_vien");
        const totalFromDto =
          toNumber((dto as any).memberCount) ??
          toNumber((dto as any).membersCount) ??
          toNumber((dto as any).totalMembers) ??
          toNumber((dto as any).totalMember) ??
          toNumber((dto as any).studentsCount);

        const fallbackMemberCount =
          totalFromDto ??
          (typeof teacherCount === "number" && typeof studentCount === "number"
            ? teacherCount + studentCount
            : undefined) ??
          deriveCountFromMembers(dto.members);

        return {
          id: (dto as any).id || index + 1,
          className: dto.className,
          description: dto.description || "",
          members: (dto.members || []).map((m, idx) => ({
            id: idx + 1,
            userId: m.userId,
            role: m.role,
            joinDate:
              typeof m.joinDate === "string" ? m.joinDate : String(m.joinDate),
          })),
          programId: dto.programId,
          program: dto.program,
          programName:
            dto.program?.name ??
            (dto.programId ? programMap.get(dto.programId) : undefined) ??
            (dto as any).programName,
          memberCount: fallbackMemberCount,
          teacherCount,
          studentCount,
        };
      }) ?? []
    );
  }, [classesQuery.data?.content, programMap]);

  const totalElements = classesQuery.data?.totalElements ?? 0;
  const totalPages = classesQuery.data?.totalPages ?? 0;

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => deleteClass(id),
    onSuccess: async () => {
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-classes"] });
      showSuccess("Xóa lớp học", "Lớp học đã được xóa.");
    },
    onError: (err: any) => showApiError(err, "Không thể xóa lớp học.", "Lỗi xóa lớp học"),
  });

  const handleToggleSort = (key: "id" | "className") => {
    setCurrentPage(0);
    if (sortKey === key) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const filteredClasses = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    if (!keyword) return mappedClasses;
    return mappedClasses.filter((item) =>
      item.className?.toLowerCase().includes(keyword)
    );
  }, [mappedClasses, searchTerm]);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget?.id) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
  };

  const isLoading = classesQuery.isLoading && !classesQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="relative w-full max-w-sm sm:max-w-xs md:max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Tìm kiếm lớp học..."
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={searchTerm}
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setCurrentPage(0);
            }}
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          Thêm lớp
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>Sắp xếp theo:</span>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors ${
                sortKey === "id"
                  ? "bg-teal-50 text-teal-600"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              onClick={() => handleToggleSort("id")}
            >
              STT {sortKey === "id" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </button>
            <button
              type="button"
              className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors ${
                sortKey === "className"
                  ? "bg-teal-50 text-teal-600"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
              onClick={() => handleToggleSort("className")}
            >
              Tên {sortKey === "className" ? (sortDir === "asc" ? "↑" : "↓") : ""}
            </button>
          </div>
          <div className="flex flex-col gap-3 text-sm text-slate-600 md:flex-row md:items-center md:gap-4">
            <div className="flex items-center gap-2">
              <span>Kích thước trang</span>
              <select
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={pageSize}
                onChange={(event) => {
                  const newSize = Number(event.target.value);
                  setPageSize(newSize);
                  setCurrentPage(0);
                }}
              >
                {[10, 20, 50].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden">
          <table className="min-w-full border-separate border-spacing-y-2 px-5 py-4">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2 w-14 text-center">STT</th>
                <th className="px-4 py-2">Tên</th>
                <th className="px-4 py-2">Mô tả</th>
                <th className="px-4 py-2">Số thành viên</th>
                <th className="px-4 py-2">Chương trình</th>
                <th className="px-4 py-2 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: Math.min(pageSize, 6) }).map((_, index) => (
                  <tr key={`class-skeleton-${index}`} className="rounded-xl bg-slate-50/60">
                    <td className="px-4 py-3">
                      <div className="mx-auto h-4 w-8 rounded bg-slate-200 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-32 rounded bg-slate-200 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-52 rounded bg-slate-200 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-16 rounded bg-slate-200 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="ml-auto flex w-full justify-end gap-2">
                        <div className="h-8 w-10 rounded bg-slate-200 animate-pulse" />
                        <div className="h-8 w-10 rounded bg-slate-200 animate-pulse" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredClasses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                    {classesQuery.data?.content?.length
                      ? "Không tìm thấy lớp phù hợp."
                      : "Chưa có lớp học nào."}
                  </td>
                </tr>
              ) : (
                filteredClasses.map((classItem, index) => (
                  <tr
                    key={classItem.id}
                    onClick={() => classItem.id && navigate(`/admin/classes/${classItem.id}`)}
                    className="rounded-xl bg-slate-50/60 text-sm text-slate-700 hover:bg-slate-100/80"
                  >
                    <td className="px-4 py-3 text-center text-slate-600">
                      {currentPage * pageSize + index + 1}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{classItem.className}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-xl">
                      {classItem.description ? (
                        <span className="line-clamp-2 leading-relaxed">{classItem.description}</span>
                      ) : (
                        <span className="italic text-slate-400">Chưa có mô tả</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold">
                          {(typeof classItem.teacherCount === "number" || typeof classItem.studentCount === "number") ?
                            (classItem.teacherCount ?? 0) + (classItem.studentCount ?? 0) :
                            classItem.memberCount ?? classItem.members?.length ?? 0}
                        </span>
                        {(typeof classItem.teacherCount === "number" || typeof classItem.studentCount === "number") && (
                          <span className="text-xs text-slate-500">
                            HV: {classItem.studentCount ?? 0} • GV: {classItem.teacherCount ?? 0}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {classItem.program?.name ??
                        classItem.programName ??
                        (classItem.programId ? `Chương trình #${classItem.programId}` : "—")}
                    </td>
                    <td className="rounded-r-xl px-4 py-3" onClick={(event) => event.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditTarget(classItem)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="h-4 w-4" />
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(classItem)}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-500 transition-colors hover:bg-rose-50"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
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

        <div className="flex flex-wrap items-center justify-between border-t border-slate-200 px-5 py-3 text-sm text-slate-600">
          <span>
            Hiển thị {filteredClasses.length} / {totalElements} lớp học
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
              disabled={currentPage === 0}
            >
              Trước
            </button>
            <span>
              Trang {totalPages === 0 ? 0 : currentPage + 1} / {totalPages || 1}
            </span>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() =>
                setCurrentPage((prev) => (prev + 1 < totalPages ? prev + 1 : prev))
              }
              disabled={currentPage + 1 >= totalPages}
            >
              Sau
            </button>
          </div>
        </div>
      </section>

      {showCreateModal && (
        <ClassFormModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-classes"] })}
        />
      )}

      {editTarget && (
        <ClassFormModal
          isOpen={Boolean(editTarget)}
          classInfo={editTarget}
          onClose={() => setEditTarget(null)}
          onSuccess={() => {
            setEditTarget(null);
            queryClient.invalidateQueries({ queryKey: ["admin-classes"] });
          }}
        />
      )}

      {deleteTarget && (
        <Transition appear show as={Fragment}>
          <Dialog
            as="div"
            className="relative z-[1000]"
            onClose={() => {
              if (!deleteMutation.isPending) setDeleteTarget(null);
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
                  <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 text-left align-middle shadow-xl transition-all">
                    <DialogTitle as="h2" className="text-lg font-semibold mb-2">Xóa lớp học</DialogTitle>
                    <p className="text-sm text-gray-600 mb-4">
                      Bạn có chắc muốn xóa lớp "{deleteTarget.className}"?
                    </p>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(null)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                        disabled={deleteMutation.isPending}
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteConfirm}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={deleteMutation.isPending}
                      >
                        {deleteMutation.isPending ? "Đang xóa..." : "Xóa"}
                      </button>
                    </div>
                  </DialogPanel>
                </TransitionChild>
              </div>
            </div>
          </Dialog>
        </Transition>
      )}

      <NotificationPopup notification={notification} onClose={hideNotification} />
    </div>
  );
}