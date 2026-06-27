import { api } from "./api";
import type {
  CreateJobActivityPayload,
  JobActivity,
  UpdateJobActivityNotePayload,
} from "../types";

const STUDENT_JOB_ACTIVITIES_ENDPOINT = "/api/student/job-activities";

type JobActivityApiResponse = {
  id: number;
  jobLead: { id: number };
  activityType: string;
  content: string;
  happenedAt: string;
  createdAt: string;
  salaryAmount?: string | null;
  note?: string | null;
  fileUrl?: string | null;
};

const mapJobActivity = (raw: JobActivityApiResponse): JobActivity => ({
  id: raw.id,
  jobLeadId: raw.jobLead?.id ?? 0,
  activityType: raw.activityType as JobActivity["activityType"],
  content: raw.content,
  happenedAt: raw.happenedAt,
  createdAt: raw.createdAt,
  salaryAmount: raw.salaryAmount ?? undefined,
  note: raw.note ?? undefined,
  fileUrl: raw.fileUrl ?? undefined,
});

export const jobActivityApi = {
  async list(jobLeadId: number): Promise<JobActivity[]> {
    const data = await api.get<JobActivityApiResponse[]>(
      `${STUDENT_JOB_ACTIVITIES_ENDPOINT}/${jobLeadId}`
    );
    return (data ?? []).map(mapJobActivity);
  },

  async create(payload: CreateJobActivityPayload): Promise<JobActivity> {
    const formData = new FormData();
    const { file, ...rest } = payload;

    formData.append(
      "data",
      new Blob([JSON.stringify({ ...rest })], {
        type: "application/json",
      })
    );

    if (file) {
      formData.append("file", file);
    }

    const data = await api.post<JobActivityApiResponse>(
      STUDENT_JOB_ACTIVITIES_ENDPOINT,
      formData
    );

    return mapJobActivity(data);
  },

  async updateNote(payload: UpdateJobActivityNotePayload): Promise<JobActivity> {
    const data = await api.put<JobActivityApiResponse>(
      `${STUDENT_JOB_ACTIVITIES_ENDPOINT}/${payload.activityId}/note`,
      {
        note: payload.note,
      }
    );

    return mapJobActivity(data);
  },
};

export default jobActivityApi;
