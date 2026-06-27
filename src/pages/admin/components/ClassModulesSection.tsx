import React, {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { UserGroupIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";

import {
  assignTeacherToClassModule,
  removeTeacherFromClassModule,
  type ClassModuleDTO,
} from "../../../services/classApi";
import type { Member, ClassInfo } from "../../../types/class";
import TableSkeleton from "../../../components/TableSkeleton";

type NotificationApi = {
  showSuccess: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showApiError: (error: unknown, fallbackMessage: string, title?: string) => void;
};

type ClassModulesSectionProps = {
  classId: number | null;
  classInfo: ClassInfo | null | undefined;
  modules: ClassModuleDTO[];
  modulesLoading: boolean;
  refetchClass: () => Promise<unknown>;
  notificationApi: NotificationApi;
};

export default function ClassModulesSection({
  classId,
  classInfo,
  modules,
  modulesLoading,
  refetchClass,
  notificationApi,
}: ClassModulesSectionProps) {
  const { showSuccess, showApiError } = notificationApi;
  const navigate = useNavigate();

  const members = (classInfo?.members as Member[] | undefined) ?? [];

  const [teachersByModule, setTeachersByModule] = useState<Record<number, any[]>>({});
  const teachersByModuleSigRef = useRef<string>("");
  const [assigningTeacherId, setAssigningTeacherId] = useState<number | null>(null);
  const [removeTeacherConfirm, setRemoveTeacherConfirm] = useState<{
    moduleId: number;
    userId: number;
    name: string;
  } | null>(null);
  const [removeTeacherLoading, setRemoveTeacherLoading] = useState(false);
  const [showTeachersModal, setShowTeachersModal] = useState(false);
  const [selectedModuleForTeachers, setSelectedModuleForTeachers] =
    useState<ClassModuleDTO | null>(null);
  const [moduleSearchTerm, setModuleSearchTerm] = useState("");
  const [moduleSortKey, setModuleSortKey] = useState<"id" | "name">("id");
  const [moduleSortDir, setModuleSortDir] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    if (!classId) return;
    void refetchClass();
  }, [classId, refetchClass]);

  useEffect(() => {
    const teacherMap: Record<number, any[]> = {};
    (modules || []).forEach((m: ClassModuleDTO) => {
      teacherMap[m.id] = Array.isArray(m.teachers) ? m.teachers : [];
    });
    const nextSignature = JSON.stringify(
      Object.entries(teacherMap)
        .map(([id, list]) => ({
          id,
          users: (list || [])
            .map((t: any) => Number(t.userId))
            .sort((a, b) => a - b),
        }))
        .sort((a, b) => Number(a.id) - Number(b.id))
    );
    if (teachersByModuleSigRef.current !== nextSignature) {
      teachersByModuleSigRef.current = nextSignature;
      setTeachersByModule(teacherMap);
    }
  }, [modules]);

  const memberNameByUserId = useMemo(() => {
    const map = new Map<number, string>();
    members.forEach((m) => {
      const u = (m as any).user || {};
      const fullName =
        u.firstName && u.lastName
          ? `${u.firstName} ${u.lastName}`
          : (u.fullName || "").trim();
      const preferred = fullName || u.username || "";
      if (m.userId && preferred) map.set(Number(m.userId), preferred);
    });
    return map;
  }, [members]);

  const filteredModules = useMemo<ClassModuleDTO[]>(() => {
    const keyword = moduleSearchTerm.trim().toLowerCase();
    const list = modules || [];
    if (!keyword) return list;
    return list.filter((module: ClassModuleDTO) =>
      (module.moduleName || "").toLowerCase().includes(keyword)
    );
  }, [moduleSearchTerm, modules]);

  const sortedModules = useMemo<ClassModuleDTO[]>(() => {
    const copy = [...filteredModules];
    const factor = moduleSortDir === "asc" ? 1 : -1;
    copy.sort((a, b) => {
      if (moduleSortKey === "name") {
        return (
          ((a.moduleName || `Module ${a.moduleId || a.id}`).localeCompare(
            b.moduleName || `Module ${b.moduleId || b.id}`,
            "vi"
          )) * factor
        );
      }
      return (a.id - b.id) * factor;
    });
    return copy;
  }, [filteredModules, moduleSortDir, moduleSortKey]);

  const handleToggleModuleSort = (key: "id" | "name") => {
    if (moduleSortKey === key) {
      setModuleSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setModuleSortKey(key);
      setModuleSortDir("asc");
    }
  };

  const handleAssignTeacher = async (
    moduleId: number,
    userId: number,
    role: "TEACHER"
  ) => {
    if (!classId) return;
    setAssigningTeacherId(userId);
    try {
      await assignTeacherToClassModule(Number(classId), moduleId, { userId, role });

      const member = members.find((m) => Number(m.userId) === Number(userId));
      const teacherObj = {
        userId,
        role,
        user: (member as any)?.user || {},
        userName: (member as any)?.user?.username,
      };
      setTeachersByModule((prev) => {
        const list = prev[moduleId] || [];
        const exists = list.some((t: any) => Number(t.userId) === Number(userId));
        if (exists) return prev;
        return { ...prev, [moduleId]: [...list, teacherObj] };
      });

      setShowTeachersModal(false);
      setSelectedModuleForTeachers(null);
      showSuccess("Gán giáo viên", "Đã gán giáo viên cho module.");
      await refetchClass();
    } catch (e: any) {
      showApiError(
        e,
        "Không thể gán giáo viên cho module. Vui lòng thử lại.",
        "Không thể gán giáo viên"
      );
    } finally {
      setAssigningTeacherId(null);
    }
  };

  const handleRemoveTeacher = async (moduleId: number, userId: number) => {
    if (!classId) return;
    try {
      await removeTeacherFromClassModule(Number(classId), moduleId, userId);
      setTeachersByModule((prev) => {
        const list = prev[moduleId] || [];
        return {
          ...prev,
          [moduleId]: list.filter((t: any) => Number(t.userId) !== Number(userId)),
        };
      });
      showSuccess("Xóa giáo viên", "Đã xóa giáo viên khỏi module.");
      await refetchClass();
    } catch (e: any) {
      showApiError(
        e,
        "Không thể xóa giáo viên khỏi module. Vui lòng thử lại.",
        "Không thể xóa giáo viên"
      );
      throw e;
    }
  };

  return (
    <section className="space-y-4">
      <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Quản lý module</h2>
            <p className="text-sm text-slate-500">
              Theo dõi danh sách module của lớp và quản lý giáo viên phụ trách.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-500">Sắp xếp:</span>
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors ${
                  moduleSortKey === "id"
                    ? "bg-teal-50 text-teal-600"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                onClick={() => handleToggleModuleSort("id")}
              >
                STT {moduleSortKey === "id" ? (moduleSortDir === "asc" ? "↑" : "↓") : ""}
              </button>
              <button
                type="button"
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors ${
                  moduleSortKey === "name"
                    ? "bg-teal-50 text-teal-600"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
                onClick={() => handleToggleModuleSort("name")}
              >
                Tên {moduleSortKey === "name" ? (moduleSortDir === "asc" ? "↑" : "↓") : ""}
              </button>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={moduleSearchTerm}
                onChange={(e) => setModuleSearchTerm(e.target.value)}
                placeholder="Tìm kiếm module..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-10 pr-3 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
              />
            </div>
          </div>
        </div>
      </header>

      {modulesLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <TableSkeleton rows={5} columns={4} />
        </div>
      ) : modules.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-slate-500">
          Chưa có module nào trong lớp học này.
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 px-5 py-4">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2 w-16">STT</th>
                  <th className="px-4 py-2">Tên module</th>
                  <th className="px-4 py-2">Giáo viên phụ trách</th>
                  <th className="px-4 py-2 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {sortedModules.map((module, idx) => (
                  <tr
                    key={module.id}
                    onClick={() => {
                      if (!classId) return;
                      const search = new URLSearchParams();
                      search.set("tab", "modules");
                      navigate({
                        pathname: `/admin/classes/${classId}/modules/${module.id}`,
                        search: search.toString(),
                      });
                    }}
                    className="rounded-xl bg-slate-50/60 text-sm text-slate-700 transition hover:bg-teal-50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-center text-slate-600">{idx + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {module.moduleName || `Module ${module.moduleId}`}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {(() => {
                        const list = teachersByModule[module.id] || [];
                        if (!list || list.length === 0) return "Chưa gán";
                        const names = list
                          .map((t: any) => {
                            const u = t.user || {};
                            const fullName =
                              u.firstName && u.lastName
                                ? `${u.firstName} ${u.lastName}`
                                : (u.fullName || "").trim();
                            const nameFromUser = fullName || u.username || "";
                            const byMember =
                              memberNameByUserId.get(Number(t.userId)) || "";
                            return byMember || nameFromUser || t.userName || "";
                          })
                          .filter(Boolean);
                        return names.join(", ");
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            setAssigningTeacherId(null);
                            setSelectedModuleForTeachers(module);
                            setShowTeachersModal(true);
                          }}
                          className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 transition-colors hover:bg-slate-100"
                          title="Quản lý giáo viên"
                        >
                          <UserGroupIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showTeachersModal && selectedModuleForTeachers && (
        <ManageModuleTeachersModal
          onClose={() => {
            setAssigningTeacherId(null);
            setShowTeachersModal(false);
            setSelectedModuleForTeachers(null);
          }}
          classMembers={members}
          moduleId={selectedModuleForTeachers.id}
          teachers={teachersByModule[selectedModuleForTeachers.id] || []}
          onAssign={(userId) =>
            handleAssignTeacher(selectedModuleForTeachers.id, userId, "TEACHER")
          }
          onRemove={(userId) =>
            setRemoveTeacherConfirm({
              moduleId: selectedModuleForTeachers.id,
              userId,
              name:
                memberNameByUserId.get(Number(userId)) ||
                (teachersByModule[selectedModuleForTeachers.id] || []).find(
                  (t: any) => Number(t.userId) === Number(userId)
                )?.userName ||
                `User ${userId}`,
            })
          }
          assigningTeacherId={assigningTeacherId}
        />
      )}

      {removeTeacherConfirm &&
        (() => {
          const content = (
            <Transition appear show as={Fragment}>
              <Dialog
                as="div"
                className="relative z-[1000]"
                onClose={() => {
                  if (!removeTeacherLoading) setRemoveTeacherConfirm(null);
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
                      <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left align-middle shadow-xl transition-all">
                        <DialogTitle as="h2" className="text-lg font-semibold text-slate-900">
                          Xóa giáo viên
                        </DialogTitle>
                        <p className="mt-2 text-sm leading-relaxed text-slate-600">
                          Bạn có chắc muốn xóa giáo viên "{removeTeacherConfirm.name}" khỏi module này?
                          Hành động này không thể hoàn tác.
                        </p>
                        <div className="mt-6 flex justify-end gap-2">
                          <button
                            type="button"
                            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                            onClick={() => setRemoveTeacherConfirm(null)}
                            disabled={removeTeacherLoading}
                          >
                            Hủy
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                            onClick={async () => {
                              if (removeTeacherLoading) return;
                              setRemoveTeacherLoading(true);
                              try {
                                await handleRemoveTeacher(
                                  removeTeacherConfirm.moduleId,
                                  removeTeacherConfirm.userId
                                );
                                setRemoveTeacherConfirm(null);
                              } catch {
                              } finally {
                                setRemoveTeacherLoading(false);
                              }
                            }}
                            disabled={removeTeacherLoading}
                          >
                            {removeTeacherLoading && (
                              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            )}
                            Xóa
                          </button>
                        </div>
                      </DialogPanel>
                    </TransitionChild>
                  </div>
                </div>
              </Dialog>
            </Transition>
          );

          if (typeof document === "undefined") {
            return content;
          }

          return createPortal(content, document.body);
        })()}

    </section>
  );
}

function ManageModuleTeachersModal({
  onClose,
  classMembers,
  moduleId,
  teachers,
  onAssign,
  onRemove,
  assigningTeacherId,
}: {
  onClose: () => void;
  classMembers: Member[];
  moduleId: number;
  teachers: Array<{
    userId: number;
    user?: any;
    userName?: string;
    role?: "TEACHER" | string;
  }>;
  onAssign: (userId: number) => void;
  onRemove: (userId: number) => void;
  assigningTeacherId: number | null;
}) {
  const [selectedUserId, setSelectedUserId] = useState<string>("");

  const memberNameByUserId = useMemo(() => {
    const map = new Map<number, string>();
    (classMembers || []).forEach((m: any) => {
      const u = (m.user || {}) as any;
      const fullName =
        u.firstName && u.lastName
          ? `${u.firstName} ${u.lastName}`
          : (u.fullName || "").trim();
      const preferred = fullName || u.username || "";
      if (m.userId && preferred) map.set(Number(m.userId), preferred);
    });
    return map;
  }, [classMembers]);

  const teacherCandidates = (classMembers || []).filter((m) => {
    const r = (m.role || "").toLowerCase();
    return r.includes("giao_vien") || r.includes("teacher");
  });

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    onAssign(Number(selectedUserId));
  };

  const content = (
    <Transition appear show as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[1000]"
        onClose={() => {
          if (assigningTeacherId === null) onClose();
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
              <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left align-middle shadow-xl transition-all">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <DialogTitle as="h2" className="text-lg font-semibold text-slate-900">
                      Quản lý giáo viên cho Module #{moduleId}
                    </DialogTitle>
                    <p className="mt-1 text-sm text-slate-600">
                      Gán hoặc xóa giáo viên cho module này.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={onClose}
                    disabled={assigningTeacherId !== null}
                  >
                    Đóng
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-600">
                      Giáo viên hiện tại
                    </label>
                    <div className="rounded-lg border border-slate-200 bg-slate-50/60">
                      {!teachers || teachers.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500">Chưa gán giáo viên</div>
                      ) : (
                        <ul className="divide-y divide-slate-200">
                          {teachers.map((t) => {
                            const u = (t.user || {}) as any;
                            const fullName =
                              u.firstName && u.lastName
                                ? `${u.firstName} ${u.lastName}`
                                : (u.fullName || "").trim();
                            const nameFromUser = fullName || u.username || "";
                            const byMember = memberNameByUserId.get(Number(t.userId)) || "";
                            const displayName =
                              byMember || nameFromUser || (t as any).userName || `User ${t.userId}`;
                            return (
                              <li key={t.userId} className="flex items-center justify-between px-4 py-3">
                                <span className="text-sm font-medium text-slate-900">
                                  {displayName}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onRemove(t.userId)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-sm text-rose-600 transition-colors hover:bg-rose-50"
                                >
                                  Xóa
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>

                  <form className="space-y-4" onSubmit={handleAssign}>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-600">
                        Gán thêm giáo viên
                      </label>
                      <select
                        value={selectedUserId}
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        disabled={assigningTeacherId !== null}
                      >
                        <option value="">Chọn giáo viên</option>
                        {teacherCandidates.map((m) => {
                          const u = (m.user || {}) as any;
                          const fullName =
                            u.firstName && u.lastName
                              ? `${u.firstName} ${u.lastName}`
                              : (u.fullName || "").trim();
                          const label = fullName || u.username || "";
                          return (
                            <option key={m.id} value={m.userId}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
                        onClick={onClose}
                        disabled={assigningTeacherId !== null}
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={!selectedUserId || assigningTeacherId !== null}
                      >
                        {assigningTeacherId !== null && (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        )}
                        {assigningTeacherId !== null ? "Đang gán..." : "Gán"}
                      </button>
                    </div>
                  </form>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );

  if (typeof document === "undefined") {
    return content;
  }

  return createPortal(content, document.body);
}
