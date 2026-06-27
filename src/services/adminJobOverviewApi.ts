import { api } from "./api";
import type { AdminJobOverviewSummary } from "../types/job";

const ADMIN_JOB_TRACKING_ENDPOINT = "/api/admin/job-tracking";

export interface AdminJobOverviewQuery {
  programId?: number;
  mentorId?: number;
}

export const adminJobOverviewApi = {
  async getSummary(query?: AdminJobOverviewQuery): Promise<AdminJobOverviewSummary> {
    return api.get<AdminJobOverviewSummary>(
      `${ADMIN_JOB_TRACKING_ENDPOINT}/overview`,
      query,
    );
  },
};

export default adminJobOverviewApi;
