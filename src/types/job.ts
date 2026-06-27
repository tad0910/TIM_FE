export type JobLeadStatusCode =
  | "NEW"
  | "APPLIED"
  | "INTERVIEWING"
  | "OFFER"
  | "PROBATION"
  | "OFFICIAL"
  | "FAILED"
  | "IGNORED";

export type JobActivityType =
  | "SEND_CV"
  | "INTERVIEW_SCHEDULED"
  | "INTERVIEW"
  | "OFFER_RECEIVED"
  | "PROBATION_CONTRACT"
  | "OFFICIAL_CONTRACT";

export interface JobLead {
  id: number;
  companyName: string;
  shortName?: string;
  address?: string;
  website?: string;
  statusCode?: JobLeadStatusCode | string | null;
  statusLabel?: string | null;
  /** Trạng thái hiển thị (ví dụ: "Mới tạo", "Đã ứng tuyển"...) */
  status: string;
  /** true nếu lead được import/giới thiệu từ phía admin */
  isFromAdmin: boolean;
  /** Thời điểm tạo/giới thiệu (ISO string) */
  date: string;
}

export interface CreateJobLeadPayload {
  companyName: string;
  shortName?: string;
  address?: string;
  website?: string;
}

export interface JobActivity {
  id: number;
  jobLeadId: number;
  activityType: JobActivityType;
  content: string;
  happenedAt: string;
  createdAt: string;
  salaryAmount?: string | null;
  note?: string | null;
  fileUrl?: string | null;
}

export interface AdminJobLeadActivity extends JobActivity {}

export interface AdminJobLeadDetail {
  id: number;
  companyName: string;
  shortName?: string | null;
  address?: string | null;
  website?: string | null;
  statusCode?: JobLeadStatusCode | string | null;
  statusLabel?: string | null;
  jobInterest: boolean;
  createdAt?: string | null;
  fromAdmin: boolean;
  activities: AdminJobLeadActivity[];
}

export interface CreateJobActivityPayload {
  jobLeadId: number;
  activityType: JobActivityType;
  content: string;
  happenedAt: string;
  salaryAmount?: string;
  file?: File | null;
}

export interface AdminJobTrackingRow {
  studentId: number;
  studentName: string;
  username?: string | null;
  jobStatusCode: string;
  jobStatusLabel: string;
  companyName: string;
  offerAmount?: string | null;
  probationSalary?: string | null;
  officialSalary?: string | null;
  jobInterest: boolean;
  lastUpdated?: string | null;
}

export interface UpdateJobActivityNotePayload {
  activityId: number;
  note: string;
}

export interface AdminJobOverviewRow extends AdminJobTrackingRow {
  className: string;
  mentorName?: string | null;
  lastActivitySummary?: string | null;
}

export interface AdminJobOverviewFilters {
  className?: string;
  mentorName?: string;
  status?: JobLeadStatusCode;
  searchTerm?: string;
  programId?: number;
  mentorId?: number;
}

export interface AdminJobOverviewStats {
  totalStudents: number;
  totalOffers: number;
  activeSearch: number;
  recentUpdatesPercent: number;
}

export interface AdminJobOverviewClassSummary {
  classId: number;
  className: string;
  programId?: number | null;
  programName?: string | null;
  totalStudents: number;
  totalLeads: number;
  offerCount: number;
  activeJobInterest: number;
  updatedWithin14Days: number;
  recentUpdatePercent: number;
  lastActivityAt?: string | null;
}

export interface AdminJobOverviewSummary {
  totalClasses: number;
  totalStudents: number;
  totalOffers: number;
  activeJobInterest: number;
  updatedWithin14Days: number;
  recentUpdatePercent: number;
  classes: AdminJobOverviewClassSummary[];
}
