import { useState } from "react";
import type { UpdateUserRequest, User } from "../../../../services/userApi";
import { getRoleDisplayName } from "../../utils/userDisplay";
import Modal from "../../../../components/ui/Modal";
import Button from "../../../../components/ui/Button";
import Input from "../../../../components/ui/Input";

interface EditUserModalProps {
  user: User;
  availableRoles: string[];
  onClose: () => void;
  onSave: (data: UpdateUserRequest) => void;
  submitting?: boolean;
}

export default function EditUserModal({
  user,
  availableRoles,
  onClose,
  onSave,
  submitting,
}: EditUserModalProps) {
  const currentRole = (user.roles && user.roles.length > 0 ? user.roles[0].name : user.role) || "";
  const [formData, setFormData] = useState({
    username: user.username,
    email: user.email,
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    phoneNumber: user.phoneNumber ?? "",
    role: currentRole,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const nextErrors: Record<string, string> = {};
    if (!formData.username.trim()) {
      nextErrors.username = "Username không được để trống";
    } else if (formData.username.length < 3) {
      nextErrors.username = "Username phải có ít nhất 3 ký tự";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event?: React.FormEvent) => {
    event?.preventDefault();
    if (!validateForm() || submitting) return;
    onSave({
      username: formData.username.trim(),
      firstName: formData.firstName.trim() || undefined,
      lastName: formData.lastName.trim() || undefined,
      phoneNumber: formData.phoneNumber.trim() || undefined,
      role: formData.role || undefined,
    });
  };

  return (
    <Modal
      isOpen={true}
      onClose={() => { if (!submitting) onClose(); }}
      title="Chỉnh sửa người dùng"
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Hủy</Button>
          <Button onClick={handleSubmit} isLoading={submitting}>Lưu thay đổi</Button>
        </>
      }
    >
      <form id="edit-user-form" onSubmit={handleSubmit} className="space-y-4 pt-2">
        <p className="text-sm text-slate-500 mb-4">{user.email}</p>
        
        <Input
          label="Username (*)"
          value={formData.username}
          onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
          error={errors.username}
        />
        
        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Họ"
            value={formData.firstName}
            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
          />
          <Input
            label="Tên"
            value={formData.lastName}
            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
          />
        </div>

        <Input
          label="Số điện thoại"
          value={formData.phoneNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
        />

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">Vai trò</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Giữ nguyên</option>
            {availableRoles.map((role) => (
              <option key={role} value={role}>
                {getRoleDisplayName(role)}
              </option>
            ))}
          </select>
        </div>
      </form>
    </Modal>
  );
}
