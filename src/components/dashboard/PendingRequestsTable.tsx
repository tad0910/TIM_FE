import { InformationCircleIcon } from "@heroicons/react/24/outline";

type PendingItem = {
  title?: string;
  description?: string;
  type?: string;
  status?: string;
};

export function PendingRequestsTable({ items }: { items: PendingItem[] }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
        <div>
          <p className="text-sm text-gray-500">Pending</p>
          <h3 className="text-lg font-semibold text-gray-900">Yêu cầu chờ xử lý</h3>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
          {items.length} mục
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-3 px-5 py-4">
            <span className="mt-0.5 rounded-md bg-indigo-50 p-2 text-indigo-600">
              <InformationCircleIcon className="h-4 w-4" />
            </span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">{item.title ?? "Yêu cầu"}</p>
              {item.description ? (
                <p className="text-sm text-gray-600">{item.description}</p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                {item.type ? (
                  <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-indigo-700">{item.type}</span>
                ) : null}
                {item.status ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700">{item.status}</span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="px-5 py-6 text-center text-sm text-gray-500">Chưa có pending requests</div>
        )}
      </div>
    </div>
  );
}
