import { Fragment, useState, useEffect } from 'react';
import { createPortal } from "react-dom";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { createClass, updateClass } from '../../../services/classApi';
import type { ClassInfo } from '../../../types/class';
import { programApi } from '../../../services/programApi';
import type { Program } from '../../../types/program';

interface ClassFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  classInfo?: ClassInfo | null;
}

export default function ClassFormModal({
  isOpen,
  onClose,
  onSuccess,
  classInfo
}: ClassFormModalProps) {
  const [className, setClassName] = useState('');
  const [description, setDescription] = useState('');
  const [programId, setProgramId] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditMode = !!classInfo;
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loadingPrograms, setLoadingPrograms] = useState<boolean>(false);
  const [programsError, setProgramsError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (isEditMode && classInfo) {
        setClassName(classInfo.className);
        setDescription(classInfo.description || '');
        setProgramId(classInfo.programId);
      } else {
        setClassName('');
        setDescription('');
        setProgramId(undefined);
      }
      setError(null);
      setLoadingPrograms(true);
      setProgramsError(null);
      programApi
        .getAllPrograms(0, 1000, 'name,asc')
        .then(async (resp) => {
          const list = Array.isArray(resp)
            ? (resp as unknown as Program[])
            : Array.isArray((resp as any)?.content)
              ? ((resp as any).content as Program[])
              : [];
          let finalList = list;
          if (isEditMode && classInfo?.programId && !list.find(p => p.id === classInfo.programId)) {
            try {
              const one = await programApi.getProgramById(classInfo.programId);
              if (one && (one as any).id) {
                finalList = [...list, one as Program];
              }
            } catch {}
          }
          setPrograms(finalList);
        })
        .catch((e) => {
          console.error('[ClassFormModal] Failed to load programs:', e);
          setPrograms([]);
          setProgramsError('Không tải được danh sách chương trình');
        })
        .finally(() => setLoadingPrograms(false));
    }
  }, [isOpen, isEditMode, classInfo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!className.trim()) {
      setError('Tên lớp học là bắt buộc');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (isEditMode && classInfo) {
        await updateClass(classInfo.id, {
          className: className.trim(),
          description: description.trim() || undefined,
          programId: programId
        });
      } else {
        await createClass({
          className: className.trim(),
          description: description.trim() || undefined,
          programId: programId
        });
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error saving class:', err);
      const errorMessage = err instanceof Error ? err.message : 'Không thể lưu lớp học';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const content = (
    <Transition appear show as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[1000]"
        onClose={() => {
          if (!isLoading) onClose();
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
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 text-left align-middle shadow-xl transition-all max-h-[90vh] overflow-y-auto">
                <div className="mb-4 flex items-center justify-between">
                  <DialogTitle as="h2" className="text-lg font-semibold text-slate-900">
                    {isEditMode ? 'Chỉnh sửa lớp học' : 'Tạo lớp học mới'}
                  </DialogTitle>
                  <button
                    type="button"
                    className="text-sm text-slate-500 transition-colors hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    Đóng
                  </button>
                </div>

                <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="className" className="mb-1 block text-sm font-medium text-slate-600">
              Tên lớp học <span className="text-rose-500">*</span>
            </label>
            <input
              id="className"
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Nhập tên lớp học"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-600">
              Mô tả
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="Nhập mô tả lớp học"
              rows={4}
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="programId" className="mb-1 block text-sm font-medium text-slate-600">
              Chương trình (tùy chọn)
            </label>
            <select
              id="programId"
              value={programId ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                setProgramId(v === '' ? undefined : Number(v));
              }}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              disabled={isLoading || loadingPrograms}
            >
              <option value=""> Không chọn </option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {loadingPrograms && (
              <p className="mt-1 text-xs text-slate-500">Đang tải danh sách chương trình...</p>
            )}
            {!loadingPrograms && programs.length === 0 && !programsError && (
              <p className="mt-1 text-xs text-slate-500">Không có chương trình nào.</p>
            )}
            {programsError && (
              <p className="mt-1 text-xs text-rose-600">{programsError}</p>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-60"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? 'Đang lưu...' : isEditMode ? 'Cập nhật' : 'Tạo lớp học'}
            </button>
          </div>
                </form>
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

