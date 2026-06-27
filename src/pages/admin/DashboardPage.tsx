import {
  AcademicCapIcon,
  ClipboardDocumentCheckIcon,
  BriefcaseIcon,
  UsersIcon,
  IdentificationIcon,
} from "@heroicons/react/24/outline";
import {
  useDashboardStats,
  useDashboardPending,
  useDashboardJobLeads,
  useDashboardGrowth,
} from "../../hooks/api/dashboard";
import { GrowthChart } from "../../components/dashboard/GrowthChart";
import { QuickActions } from "../../components/dashboard/QuickActions";
import { PendingRequestsTable } from "../../components/dashboard/PendingRequestsTable";
import { JobLeadsPanel } from "../../components/dashboard/JobLeadsPanel";

type StatCardProps = {
  label: string;
  value: number | string;
  icon: typeof AcademicCapIcon;
  color: string;
  path?: string;
};

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <div
      className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
        <div className={`${color} rounded-lg p-3`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-3 w-20 rounded bg-gray-200" />
          <div className="h-6 w-16 rounded bg-gray-200" />
        </div>
        <div className="h-10 w-10 rounded-lg bg-gray-200" />
      </div>
    </div>
  );
}

function SectionShell({
  title,
  action,
  loading,
  error,
  empty,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  loading?: boolean;
  error?: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      <div className="p-5">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-32 rounded bg-gray-200" />
            <div className="h-4 w-24 rounded bg-gray-200" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            Lỗi tải dữ liệu: {error}
          </div>
        ) : empty ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
            Chưa có dữ liệu
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {

  const { data: statsData, isLoading: statsLoading } = useDashboardStats();
  const { data: pendingData, isLoading: pendingLoading, isError: pendingError, error: pendingErrObj } = useDashboardPending();
  const { data: jobLeadData, isLoading: jobLeadLoading, isError: jobLeadError, error: jobLeadErrObj } = useDashboardJobLeads();
  const { data: growthDataResp, isLoading: growthLoading } = useDashboardGrowth(6);

  const stats = {
    students: (statsData as any)?.students ?? (statsData as any)?.currentStudents ?? 0,
    pendingForms: (statsData as any)?.pendingForms ?? (statsData as any)?.pendingRequests ?? 0,
    jobPending: (statsData as any)?.jobPending ?? (statsData as any)?.jobLeadsPending ?? 0,
    activeClasses: (statsData as any)?.activeClasses ?? (statsData as any)?.classes ?? 0,
    activeMentors: (statsData as any)?.activeMentors ?? (statsData as any)?.mentors ?? 0,
  };

  const growthPoints =
    Array.isArray(growthDataResp?.points) && growthDataResp?.points.length > 0
      ? growthDataResp.points
      : [];

  const statCards: StatCardProps[] = [
    { label: "Học viên hiện tại", value: stats.students, icon: AcademicCapIcon, color: "bg-blue-500" },
    { label: "Đơn chờ duyệt", value: stats.pendingForms, icon: ClipboardDocumentCheckIcon, color: "bg-amber-500" },
    { label: "Cơ hội việc làm chờ xử lý", value: stats.jobPending, icon: BriefcaseIcon, color: "bg-indigo-500" },
    { label: "Lớp đang hoạt động", value: stats.activeClasses, icon: UsersIcon, color: "bg-emerald-500" },
    { label: "Giáo viên hiện tại", value: stats.activeMentors, icon: IdentificationIcon, color: "bg-pink-500" },
  ];

  const pendingItems: any[] = Array.isArray((pendingData as any)?.items) ? (pendingData as any).items : [];
  const jobLeadItems: any[] = Array.isArray((jobLeadData as any)?.items) ? (jobLeadData as any).items : [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statsLoading
          ? Array.from({ length: 5 }).map((_, idx) => <SkeletonCard key={idx} />)
          : statCards.map((stat) => <StatCard key={stat.label} {...stat} />)}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <GrowthChart
            data={growthPoints.map((p) => ({ label: p.label, value: p.value }))}
            loading={growthLoading}
          />
        </div>
        <div className="lg:col-span-4">
          <QuickActions />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <SectionShell
            title="Cơ hội việc làm"
            loading={jobLeadLoading}
            error={jobLeadError ? (jobLeadErrObj as any)?.message ?? "Lỗi tải cơ hội việc làm" : undefined}
            empty={!jobLeadLoading && !jobLeadError && jobLeadItems.length === 0}
          >
            <JobLeadsPanel items={jobLeadItems} />
          </SectionShell>
        </div>

        <div className="lg:col-span-5">
          <SectionShell
            title="Yêu cầu chờ duyệt"
            loading={pendingLoading}
            error={pendingError ? (pendingErrObj as any)?.message ?? "Lỗi tải yêu cầu chờ duyệt" : undefined}
            empty={!pendingLoading && !pendingError && pendingItems.length === 0}
          >
            <PendingRequestsTable items={pendingItems} />
          </SectionShell>
        </div>
      </div>
    </div>
  );
}
