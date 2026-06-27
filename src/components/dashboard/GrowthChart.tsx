type GrowthDatum = {
  label: string;
  value: number;
  color?: string;
};

type Props = {
  loading?: boolean;
  data?: GrowthDatum[];
};

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function GrowthChart({ data, loading }: Props) {
  const safeData = Array.isArray(data) ? data : [];

  return (
    <div className="h-full rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between pb-3">
        <div>
          <p className="text-sm text-gray-500">Tăng trưởng</p>
          <h3 className="text-lg font-semibold text-gray-900">Tăng trưởng học viên</h3>
        </div>
        {!loading && (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Cập nhật mới
          </span>
        )}
      </div>

      <div className="relative h-64 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">Đang tải...</div>
        ) : safeData.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">Chưa có dữ liệu</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={safeData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <defs>
                <linearGradient id="growthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#475569" }} />
              <YAxis tick={{ fontSize: 11, fill: "#475569" }} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: "1px solid #dbeafe", boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                labelStyle={{ color: "#0f172a", fontWeight: 600 }}
                formatter={(value) => [`${value}`, "Học viên"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#2563eb"
                strokeWidth={3}
                fill="url(#growthGradient)"
                activeDot={{ r: 6, strokeWidth: 2, stroke: "#1d4ed8", fill: "#2563eb" }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
