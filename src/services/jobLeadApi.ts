import { api } from "./api";
import type { CreateJobLeadPayload, JobLead } from "../types";

const STUDENT_JOB_LEADS_ENDPOINT = "/api/student/job-leads";

type JobLeadApiResponse = {
  id: number;
  companyName: string;
  shortName?: string;
  address?: string;
  website?: string;
  statusCode?: string | null;
  statusLabel?: string | null;
  status: string;
  isFromAdmin?: boolean;
  fromAdmin?: boolean;
  date: string;
};

const mapJobLead = (raw: JobLeadApiResponse): JobLead => ({
  id: raw.id,
  companyName: raw.companyName,
  shortName: raw.shortName,
  address: raw.address,
  website: raw.website,
  statusCode: raw.statusCode ?? null,
  statusLabel: raw.statusLabel ?? null,
  status: raw.status,
  isFromAdmin: Boolean(
    raw.isFromAdmin ?? raw.fromAdmin ?? false
  ),
  date: raw.date,
});

export const jobLeadApi = {
  async getMyLeads(studentId: number): Promise<JobLead[]> {
    const data = await api.get<JobLeadApiResponse[]>(
      `${STUDENT_JOB_LEADS_ENDPOINT}/my-leads/${studentId}`
    );
    return (data ?? []).map(mapJobLead);
  },

  async create(studentId: number, payload: CreateJobLeadPayload): Promise<JobLead> {
    const data = await api.post<JobLeadApiResponse>(
      `${STUDENT_JOB_LEADS_ENDPOINT}/${studentId}`,
      payload
    );
    return mapJobLead(data);
  },

  async delete(leadId: number, studentId: number) {
    return api.delete<string>(
      `${STUDENT_JOB_LEADS_ENDPOINT}/${leadId}/student/${studentId}`
    );
  },
};

export default jobLeadApi;
