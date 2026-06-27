import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface UserManagementToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  sortKey: "id" | "username";
  sortDir: "asc" | "desc";
  onToggleSort: (key: "id" | "username") => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

export default function UserManagementToolbar({
  searchTerm,
  onSearchChange,
  sortKey,
  sortDir,
  onToggleSort,
  pageSize,
  onPageSizeChange,
}: UserManagementToolbarProps) {
  const sortConfigs: Array<{ key: "id" | "username"; label: string }> = [
    { key: "id", label: "ID" },
    { key: "username", label: "Username" },
  ];

  const pageSizeOptions = [10, 20, 50];

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white/80 p-4 shadow-sm backdrop-blur">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-slate-500">Sắp xếp</span>
          <div className="flex flex-wrap gap-2">
            {sortConfigs.map((config) => (
              <button
                key={config.key}
                type="button"
                onClick={() => onToggleSort(config.key)}
                className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition ${
                  sortKey === config.key
                    ? "border-violet-500 bg-gradient-to-r from-violet-500 to-indigo-500 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:text-violet-600"
                }`}
              >
                {config.label}
                {sortKey === config.key ? (
                  <span>{sortDir === "asc" ? "↑" : "↓"}</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span>Kích thước trang</span>
          <div className="flex rounded-full border border-slate-200 bg-white p-1">
            {pageSizeOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => onPageSizeChange(option)}
                className={`min-w-[60px] rounded-full px-3 py-1 text-sm transition ${
                  pageSize === option
                    ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white"
                    : "text-slate-600 hover:text-indigo-500"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Tìm theo tên, username, email..."
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-12 pr-4 text-sm text-slate-700 shadow-inner focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
      </div>
    </div>
  );
}
