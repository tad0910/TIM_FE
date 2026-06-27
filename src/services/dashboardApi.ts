import { api } from "./api";

export type DashboardStatsResponse = {
  students: number;
  pendingForms: number;
  jobPending: number;
  activeClasses: number;
  activeMentors: number;
};

export type DashboardPendingItem = {
  title?: string;
  description?: string;
  type?: string;
  status?: string;
};

export type DashboardPendingResponse = {
  items: DashboardPendingItem[];
};

export type DashboardScheduleItem = {
  title?: string;
  description?: string;
  date?: string;
  time?: string;
};

export type DashboardScheduleResponse = {
  items: DashboardScheduleItem[];
};

export type DashboardJobLead = {
  company?: string;
  position?: string;
  status?: string;
  mentor?: string;
  deadline?: string;
};

export type DashboardJobLeadsResponse = {
  items: DashboardJobLead[];
};

export type GrowthPoint = { label: string; value: number };
export type GrowthResponse = { points: GrowthPoint[] };

const mockStats: DashboardStatsResponse = {
  students: 486,
  pendingForms: 12,
  jobPending: 8,
  activeClasses: 24,
  activeMentors: 18,
};

const mockGrowth: GrowthResponse = {
  points: [
    { label: "2025-01", value: 10 },
    { label: "2025-02", value: 14 },
    { label: "2025-03", value: 18 },
    { label: "2025-04", value: 21 },
    { label: "2025-05", value: 24 },
    { label: "2025-06", value: 26 },
  ],
};

const mockPending: DashboardPendingResponse = {
  items: [
    { title: "Đơn xin bảo lưu", description: "Nguyễn Văn A • Lớp Java 07", type: "Form" },
    { title: "Xét duyệt điểm danh", description: "Trần Thị B • Lớp FE 12", type: "Attendance" },
    { title: "Yêu cầu hoàn học phí", description: "Lê C • Lớp JS 03", type: "Finance" },
  ],
};

const mockSchedule: DashboardScheduleResponse = {
  items: [
    { title: "Java 07 - Buổi 12", description: "OOP & Interface", date: "Thứ 3", time: "18:30" },
    { title: "FE 12 - Buổi 6", description: "React Hooks", date: "Thứ 4", time: "18:30" },
    { title: "Mentor sync", description: "Weekly sync mentors", date: "Thứ 5", time: "20:00" },
  ],
};

const mockJobLeads: DashboardJobLeadsResponse = {
  items: [
    { company: "FPT Software", position: "Frontend Intern", status: "Interviewing", mentor: "Mentor A", deadline: "20/12" },
    { company: "VNG", position: "Backend Fresher", status: "Pending", mentor: "Mentor B", deadline: "22/12" },
    { company: "NashTech", position: "QA Intern", status: "Offer", mentor: "Mentor C", deadline: "18/12" },
  ],
};

const USE_MOCK = false;

export function getDashboardStats() {
  if (USE_MOCK) return Promise.resolve(mockStats);
  return api.get<DashboardStatsResponse>("/admin/dashboard/stats");
}

export function getDashboardGrowth(months = 6) {
  if (USE_MOCK) return Promise.resolve(mockGrowth);
  return api.get<GrowthResponse>(`/admin/dashboard/growth?months=${months}`);
}

export function getDashboardPending() {
  if (USE_MOCK) return Promise.resolve(mockPending);
  return api.get<DashboardPendingResponse>("/admin/dashboard/pending-requests");
}

export function getDashboardSchedule() {
  if (USE_MOCK) return Promise.resolve(mockSchedule);
  return api.get<DashboardScheduleResponse>("/admin/dashboard/weekly-schedule");
}

export function getDashboardJobLeads() {
  if (USE_MOCK) return Promise.resolve(mockJobLeads);
  return api.get<DashboardJobLeadsResponse>("/admin/dashboard/job-leads");
}
