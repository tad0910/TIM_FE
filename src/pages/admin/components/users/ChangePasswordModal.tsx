import React, { useState } from 'react';
import Modal from '../../../../components/ui/Modal';
import Button from '../../../../components/ui/Button';
import Input from '../../../../components/ui/Input';
import type { User } from '../../../../services/userApi';
import { changeUserPassword } from '../../../../services/userApi';
import { useNotification } from '../../../../hooks/useNotification';

interface ChangePasswordModalProps {
  user: User;
  onClose: () => void;
}

export default function ChangePasswordModal({ user, onClose }: ChangePasswordModalProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { showSuccess, showApiError } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Mật khẩu không được để trống');
      return;
    }
    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    try {
      setIsSubmitting(true);
      await changeUserPassword(user.id, password);
      showSuccess('Thành công', 'Đổi mật khẩu người dùng thành công');
      onClose();
    } catch (err) {
      showApiError(err, 'Lỗi đổi mật khẩu');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Đổi mật khẩu: ${user.username}`}
      maxWidth="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            Lưu Thay Đổi
          </Button>
        </>
      }
    >
      <form id="change-password-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="text-sm text-rose-500">{error}</p>}
        <Input
          label="Mật khẩu mới"
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          placeholder="Nhập mật khẩu mới"
        />
        <Input
          label="Xác nhận mật khẩu"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setError('');
          }}
          placeholder="Nhập lại mật khẩu"
        />
      </form>
    </Modal>
  );
}
