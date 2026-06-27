import { Fragment } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { User } from "../../../../services/userApi";
import { getDisplayName } from "../../utils/userDisplay";

interface DeleteUserModalProps {
  user: User;
  onClose: () => void;
  onConfirm: () => void;
  submitting?: boolean;
}

export default function DeleteUserModal({
  user,
  onClose,
  onConfirm,
  submitting,
}: DeleteUserModalProps) {
  const displayName =
    user.username ||
    getDisplayName(user) ||
    (user.id ? `#${user.id}` : "người dùng này");

  return (
    <Transition appear show as={Fragment}>
      <Dialog as="div" className="relative z-[1200]" onClose={() => { if (!submitting) onClose(); }}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200 transition-opacity"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150 transition-opacity"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/45 backdrop-blur-sm" />
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
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-200 bg-white text-left align-middle shadow-2xl transition-all">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
                  <DialogTitle as="h3" className="text-lg font-semibold text-slate-900">
                    Xóa người dùng
                  </DialogTitle>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={submitting}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <div className="px-6 py-6">
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-slate-600">
                      Bạn có chắc muốn xóa "{displayName}" khỏi hệ thống?
                    </p>
                  </div>

                  <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                      disabled={submitting}
                    >
                      Hủy
                    </button>
                    <button
                      type="button"
                      onClick={onConfirm}
                      className="rounded-lg bg-rose-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={submitting}
                    >
                      {submitting ? "Đang xóa..." : "Xóa"}
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
