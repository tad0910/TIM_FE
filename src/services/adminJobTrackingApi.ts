import { api } from "./api";
import type { AdminJobTrackingRow } from "../types/job";

const ADMIN_JOB_TRACKING_ENDPOINT = "/api/admin/job-tracking";

export const adminJobTrackingApi = {
  async list(classId: number): Promise<AdminJobTrackingRow[]> {
    return api.get<AdminJobTrackingRow[]>(
      `${ADMIN_JOB_TRACKING_ENDPOINT}/classes/${classId}`
    );
  },

  async updateJobInterest(
    classId: number,
    studentId: number,
    jobInterest: boolean
  ): Promise<AdminJobTrackingRow> {
    return api.patch<AdminJobTrackingRow>(
      `${ADMIN_JOB_TRACKING_ENDPOINT}/classes/${classId}/students/${studentId}`,
      { jobInterest }
    );
  },
};

export default adminJobTrackingApi;
