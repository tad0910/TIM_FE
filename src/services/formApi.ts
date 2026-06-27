import { api } from "./api";
import type {
  FormTemplate,
  StudentFormResponse,
  StudentFormCreateDTO,
  ApprovalStatus,
} from "../types/form";

export const studentFormApi = {
  getTemplates: (): Promise<FormTemplate[]> => api.get("/forms/templates"),
  getForms: (): Promise<StudentFormResponse[]> => api.get("/forms"),
  getFormDetail: (formId: number): Promise<StudentFormResponse> =>
    api.get(`/forms/${formId}`),
  createForm: (data: StudentFormCreateDTO): Promise<StudentFormResponse> =>
    api.post("/forms", data),
  approveForm: (
    formId: number,
    data: {
      decision: ApprovalStatus;
      note?: string;
      targetRole?: string;
      moduleId?: number | null;
      moduleSessionId?: number | null;
    }
  ): Promise<StudentFormResponse> =>
    api.put(`/forms/${formId}/approve`, data),
  deleteForm: (formId: number): Promise<string> => api.delete(`/forms/${formId}`),
};

export default studentFormApi;

