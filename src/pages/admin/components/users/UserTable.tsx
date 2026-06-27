import React, { useState } from 'react';
import type { User } from "../../../../services/userApi";
import { getDisplayName, getRoleName } from "../../utils/userDisplay";
import { Pencil, Trash2, KeyRound } from "lucide-react";
import Table from "../../../../components/ui/Table";
import Button from "../../../../components/ui/Button";
import ChangePasswordModal from "./ChangePasswordModal";

interface UserTableProps {
  users: User[];
  filteredUsers: User[];
  rowOffset: number;
  onSelectUser: (user: User) => void;
  onDeleteUser: (userId: number) => void;
  isError: boolean;
  errorMessage?: string | null;
}

export default function UserTable({
  filteredUsers,
  rowOffset,
  onSelectUser,
  onDeleteUser,
  isError,
  errorMessage,
}: UserTableProps) {
  const [passwordUser, setPasswordUser] = useState<User | null>(null);

  if (isError) {
    return (
      <div className="p-8 text-center text-rose-600">
        {errorMessage || "Đã xảy ra lỗi, vui lòng thử lại."}
      </div>
    );
  }

  return (
    <>
      <Table
        data={filteredUsers}
        keyExtractor={(u) => u.id}
        emptyMessage="Không tìm thấy người dùng phù hợp"
        columns={[
          {
            key: 'stt',
            header: 'STT',
            width: '60px',
            align: 'center',
            render: (_, index) => rowOffset + (index ?? 0) + 1
          },
          {
            key: 'name',
            header: 'Tên',
            render: (u) => <span className="font-semibold text-slate-900">{getDisplayName(u)}</span>
          },
          { key: 'username', header: 'Username' },
          { key: 'email', header: 'Email' },
          { key: 'phone', header: 'Số điện thoại', render: (u) => u.phoneNumber || "—" },
          { 
            key: 'role', 
            header: 'Vai trò',
            render: (u) => <span className="text-indigo-600 font-medium">{getRoleName(u)}</span>
          },
          {
            key: 'actions',
            header: 'Thao tác',
            align: 'right',
            render: (u) => (
              <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPasswordUser(u)}
                  title="Đổi mật khẩu"
                >
                  <KeyRound className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSelectUser(u)}
                  title="Chỉnh sửa"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => onDeleteUser(u.id)}
                  title="Xóa"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )
          }
        ]}
      />

      {passwordUser && (
        <ChangePasswordModal
          user={passwordUser}
          onClose={() => setPasswordUser(null)}
        />
      )}
    </>
  );
}
