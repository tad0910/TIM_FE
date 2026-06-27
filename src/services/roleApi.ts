import { api } from "./api";

export interface Permission {
  id: number;
  name: string;
  description?: string;
}

export interface Role {
  id: number;
  name: string;
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

export const getAllPermissions = async (): Promise<Permission[]> => {
  try {
    const res = await api.get<any>('/roles/permissions');
    return Array.isArray(res) ? res : res?.content || [];
  } catch (error) {
    console.error("Failed to fetch permissions:", error);
    return [];
  }
};

export const updateRolePermissions = async (roleId: number, permissionIds: number[]): Promise<void> => {
  return api.put(`/roles/${roleId}/permissions`, { permissionIds });
};

export default {
  getAllRoles,
  getAllPermissions,
  updateRolePermissions
};
