import { BriefcaseIcon, UsersIcon } from "@heroicons/react/24/outline";
import type { DashboardJobLead } from "../../services/dashboardApi";

export function JobLeadsPanel({ items }: { items: DashboardJobLead[] }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <p className="text-sm text-gray-500">Đầu mối công việc</p>
          <h3 className="text-lg font-semibold text-gray-900">Theo dõi việc làm gần đây</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {items.length} đầu mối
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3 px-5 py-4">
            <span className="mt-0.5 rounded-md bg-indigo-50 p-2 text-indigo-600">
              <BriefcaseIcon className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-gray-900">
                  {item.position ?? "Vị trí"} @ {item.company ?? "Công ty"}
                </p>
                {item.deadline ? (
                  <span className="text-xs text-gray-500">{item.deadline}</span>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                {item.status ? (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">
                    {item.status}
                  </span>
                ) : null}
                {item.mentor ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">
                    <UsersIcon className="h-3.5 w-3.5" />
                    {item.mentor}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-gray-500">Chưa có job lead nào</div>
        )}
      </div>
    </div>
  );
}
