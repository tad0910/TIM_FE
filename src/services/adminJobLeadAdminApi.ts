import { api } from "./api";
import type { AdminJobLeadDetail, CreateJobLeadPayload } from "../types/job";

const ADMIN_JOB_TRACKING_ENDPOINT = "/api/admin/job-tracking";

export const adminJobLeadAdminApi = {
  async listByStudent(classId: number, studentId: number): Promise<AdminJobLeadDetail[]> {
    return api.get<AdminJobLeadDetail[]>(
      `${ADMIN_JOB_TRACKING_ENDPOINT}/classes/${classId}/students/${studentId}/leads`
    );
  },

  async create(classId: number, studentId: number, payload: CreateJobLeadPayload): Promise<AdminJobLeadDetail> {
    return api.post<AdminJobLeadDetail>(
      `${ADMIN_JOB_TRACKING_ENDPOINT}/classes/${classId}/students/${studentId}/leads`,
      payload
    );
  },
};

export default adminJobLeadAdminApi;
