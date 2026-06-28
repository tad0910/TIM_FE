import { api } from "./api";

export interface Permission {
  id: number;
  name: string;
  code: string;
  description?: string;
}

export interface Role {
  id: number;
  name: string;
  code: string;
  permissions?: Permission[];
}

export const getAllRoles = async (): Promise<Role[]> => {
  try {
    const res = await api.get<any>('/roles');
    return Array.isArray(res) ? res : res?.content || [];
  } catch (error) {
    console.error("Failed to fetch roles:", error);
    return [];
  }
};

export const createRole = async (role: Partial<Role>): Promise<Role> => {
  return api.post('/roles', role);
};

export const updateRole = async (roleId: number, role: Partial<Role>): Promise<Role> => {
  return api.put(`/roles/${roleId}`, role);
};

export const getAllPermissions = async (): Promise<Permission[]> => {
  try {
    const res = await api.get<any>('/roles/permissions');
    return Array.isArray(res) ? res : res?.content || [];
  } catch (error) {
    console.error("Failed to fetch permissions:", error);
    return [];
  }
};

export const createPermission = async (permission: Partial<Permission>): Promise<Permission> => {
  return api.post('/roles/permissions', permission);
};

export const updatePermission = async (permissionId: number, permission: Partial<Permission>): Promise<Permission> => {
  return api.put(`/roles/permissions/${permissionId}`, permission);
};

export const deleteRole = async (roleId: number): Promise<void> => {
  return api.delete(`/roles/${roleId}`);
};

export const deletePermission = async (permissionId: number): Promise<void> => {
  return api.delete(`/roles/permissions/${permissionId}`);
};

export const updateRolePermissions = async (roleId: number, permissionIds: number[]): Promise<void> => {
  return api.put(`/roles/${roleId}/permissions`, { permissionIds });
};

export default {
  getAllRoles,
  createRole,
  updateRole,
  deleteRole,
  getAllPermissions,
  createPermission,
  updatePermission,
  deletePermission,
  updateRolePermissions
};
