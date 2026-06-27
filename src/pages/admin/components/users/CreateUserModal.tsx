import { Fragment, useState } from "react";
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { CreateUserRequest } from "../../../../services/userApi";
import { getRoleDisplayName } from "../../utils/userDisplay";

interface CreateUserModalProps {
  availableRoles: string[];
  onClose: () => void;
  onSave: (data: CreateUserRequest) => void;
  submitting?: boolean;
}

export default function CreateUserModal({
  availableRoles,
  onClose,
  onSave,
  submitting,
}: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phoneNumber: "",
    role: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleClose = () => {
    if (!submitting) onClose();
  };

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.username.trim()) {
      nextErrors.username = "Username không được để trống";
    } else if (formData.username.length < 3) {
      nextErrors.username = "Username phải có ít nhất 3 ký tự";
    }

    if (!formData.email.trim()) {
      nextErrors.email = "Email không được để trống";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      nextErrors.email = "Email không hợp lệ";
    }

    if (!formData.password.trim()) {
      nextErrors.password = "Mật khẩu không được để trống";
    } else if (formData.password.length < 6) {
      nextErrors.password = "Mật khẩu phải có ít nhất 6 ký tự";
    }

    const phone = formData.phoneNumber.trim();
    if (phone) {
      if (!/^[0-9]+$/.test(phone)) {
        nextErrors.phoneNumber = "Số điện thoại chỉ được chứa số";
      } else if (phone.length < 10) {
        nextErrors.phoneNumber = "Số điện thoại phải có ít nhất 10 chữ số";
      } else if (phone.length > 11) {
        nextErrors.phoneNumber = "Số điện thoại không vượt quá 11 chữ số";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm() || submitting) return;
    onSave({
      username: formData.username.trim(),
      email: formData.email.trim(),
      password: formData.password,
      firstName: formData.firstName.trim() || undefined,
      lastName: formData.lastName.trim() || undefined,
      phoneNumber: formData.phoneNumber.trim() || undefined,
      role: formData.role || undefined,
    });
  };

  return (
    <Transition appear show as={Fragment}>
      <Dialog as="div" className="relative z-[1200]" onClose={handleClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200 transition-opacity"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150 transition-opacity"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
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
              <DialogPanel className="w-full max-w-lg transform overflow-hidden rounded-2xl border border-slate-200 bg-white text-left align-middle shadow-2xl transition-all">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
                  <div>
                    <DialogTitle as="h2" className="text-lg font-semibold text-slate-900">
                      Tạo người dùng mới
                    </DialogTitle>
                    <p className="mt-1 text-sm text-slate-500">
                      Điền thông tin cơ bản để thêm người dùng.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={submitting}
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Username"
              required
              error={errors.username}
              value={formData.username}
              onChange={(value) => setFormData((prev) => ({ ...prev, username: value }))}
              placeholder="ví dụ: hongson"
            />
            <FormField
              label="Email"
              required
              type="email"
              error={errors.email}
              value={formData.email}
              onChange={(value) => setFormData((prev) => ({ ...prev, email: value }))}
              placeholder="email@company.com"
            />
          </div>
          <FormField
            label="Mật khẩu"
            required
            type="password"
            error={errors.password}
            value={formData.password}
            onChange={(value) => setFormData((prev) => ({ ...prev, password: value }))}
            placeholder="Tối thiểu 6 ký tự"
          />
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Họ"
              value={formData.firstName}
              onChange={(value) => setFormData((prev) => ({ ...prev, firstName: value }))}
            />
            <FormField
              label="Tên"
              value={formData.lastName}
              onChange={(value) => setFormData((prev) => ({ ...prev, lastName: value }))}
            />
          </div>
          <FormField
            label="Số điện thoại"
            error={errors.phoneNumber}
            value={formData.phoneNumber}
            onChange={(value) => setFormData((prev) => ({ ...prev, phoneNumber: value }))}
            placeholder="0987xxx..."
          />
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">Vai trò</label>
            <select
              value={formData.role}
              onChange={(event) =>
                setFormData((prev) => ({ ...prev, role: event.target.value }))
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Chọn vai trò</option>
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {getRoleDisplayName(role)}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500">Không chọn sẽ mặc định là Người dùng.</p>
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
              type="submit"
              className="rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={submitting}
            >
              {submitting ? "Đang tạo..." : "Tạo người dùng"}
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
}

interface FormFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  placeholder?: string;
  error?: string;
}

function FormField({
  label,
  value,
  onChange,
  required,
  type = "text",
  placeholder,
  error,
}: FormFieldProps) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-slate-700">
        {label} {required ? <span className="text-rose-500">*</span> : null}
      </label>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
          error
            ? "border-rose-400 focus:border-rose-400 focus:ring-rose-100"
            : "border-slate-300 focus:border-teal-500 focus:ring-teal-500/30"
        }`}
      />
      {error ? <p className="text-xs text-rose-500">{error}</p> : null}
    </div>
  );
}
