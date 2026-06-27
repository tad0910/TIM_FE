import type { User } from "../../../services/userApi";

const roleMap: Record<string, string> = {
  ROLE_USER: "Người dùng",
  ROLE_ADMIN: "Quản trị viên",
  ROLE_GIAOVIEN: "Giáo viên",
  ROLE_GIAO_VIEN: "Giáo viên",
};

export const getRoleDisplayName = (role: string): string => {
  return roleMap[role] || role;
};

export const getDisplayName = (user: User): string => {
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  if (user.firstName) return user.firstName;
  if (user.lastName) return user.lastName;
  return user.username;
};

export const getRoleName = (user: User): string => {
  if (user.role) return getRoleDisplayName(user.role);
  if (user.roles && user.roles.length > 0) {
    return user.roles.map((r) => getRoleDisplayName(r.name)).join(", ");
  }
  return "-";
};
