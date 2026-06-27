import { api } from "./api";
import type { PageResponse } from "../types/pagination";

export interface User {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profileImage?: string;
  coverImage?: string;
  role?: string;
  roles?: Array<{ id: number; name: string }>;
  createdAt: string;
  keycloakId?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role?: string;
}

export const getAllUsers = async (page: number = 0, size: number = 10, sort?: string | string[]): Promise<PageResponse<User>> => {
  const query: Record<string, any> = { page, size };
  if (sort) {
    if (Array.isArray(sort)) query.sort = sort as any;
    else query.sort = sort;
  }
  return api.get<PageResponse<User>>('/users', query);
};

export const getAllUsersAsArray = async (): Promise<User[]> => {
  const response = await getAllUsers(0, 1000);
  return response.content;
};

export const getUserById = async (userId: number): Promise<User> => {
  return api.get<User>(`/users/${userId}`);
};

export const createUser = async (data: CreateUserRequest): Promise<User> => {
  interface CreateUserPayload {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    roles?: Array<{ name: string }>;
  }
  
  const requestData: CreateUserPayload = {
    username: data.username,
    email: data.email,
    password: data.password,
    firstName: data.firstName,
    lastName: data.lastName,
    phoneNumber: data.phoneNumber,
  };
  
  if (data.role) {
    requestData.roles = [{ name: data.role }];
  }
  
  return api.post<User>('/users', requestData);
};

export const updateUser = async (userId: number, data: UpdateUserRequest): Promise<User> => {
  return api.put<User>(`/users/${userId}`, data);
};

export const deleteUser = async (userId: number): Promise<void> => {
  return api.delete<void>(`/users/${userId}`);
};

export const getAllUsersIncludingDeleted = async (page: number = 0, size: number = 10, sort?: string | string[]): Promise<PageResponse<User>> => {
  const query: Record<string, any> = { page, size };
  if (sort) {
    if (Array.isArray(sort)) query.sort = sort as any;
    else query.sort = sort;
  }
  return api.get<PageResponse<User>>('/users/all', query);
};

export const restoreUser = async (userId: number): Promise<void> => {
  return api.post<void>(`/users/${userId}/restore`);
};

export const changeUserPassword = async (userId: number, password: string): Promise<void> => {
  await api.put(`/auth/users/${userId}/password`, { password });
};

export default {
  getAllUsers,
  getAllUsersAsArray,
  getAllUsersIncludingDeleted,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  restoreUser,
  changeUserPassword
};

