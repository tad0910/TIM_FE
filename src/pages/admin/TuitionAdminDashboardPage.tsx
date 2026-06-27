import { useEffect, useMemo, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { Program } from '../../types/program';
import type { TuitionRouteDTO } from '../../services/tuitionRouteApi';
import { tuitionRouteApi } from '../../services/tuitionRouteApi';
import { programApi } from '../../services/programApi';
import CreateTuitionRouteModal from './CreateTuitionRouteModal';
import CurrencyDisplay from '../../components/tuition/CurrencyDisplay';
import TableSkeleton from '../../components/TableSkeleton';
import TuitionRouteDetailModal from './TuitionRouteDetailModal';
import TuitionRouteEditModal from './TuitionRouteEditModal';
import CouponAdminPage from './CouponAdminPage';
import TuitionAdminService, { type TuitionTransactionDTO } from '../../services/tuitionAdminService';
import { parseBackendDate } from '../../utils/timeFormat';
import { couponApi } from '../../services/couponApi';
import { Search } from 'lucide-react';
import { useAdminHeader } from '../../components/admin/layout/AdminShell';
import { Pencil } from 'lucide-react';

export default function TuitionAdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<'routes' | 'coupons' | 'history'>('routes');
  const { updateHeader, resetHeader } = useAdminHeader();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<TuitionRouteDTO | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [sortKey, setSortKey] = useState<'id'|'name'>('id');
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('asc');

  const [historyPage, setHistoryPage] = useState(0);
  const [historySize, setHistorySize] = useState(10);
  const [historySortKey, setHistorySortKey] = useState<'stt' | 'date' | 'amount'>('stt');
  const [historySortDir, setHistorySortDir] = useState<'asc' | 'desc'>('asc');
  const [historySearch, setHistorySearch] = useState('');
  const [activeCouponsCount, setActiveCouponsCount] = useState(0);

  useEffect(() => {
    updateHeader({
      title: 'Quản lý Học phí',
      breadcrumbs: [
        { label: 'Quản trị', href: '/admin/dashboard' },
        { label: 'Học phí' },
      ],
    });
    return () => {
      resetHeader();
    };
  }, [resetHeader, updateHeader]);

  const toggleSort = (key: 'id'|'name') => {
    setCurrentPage(0);
    if (sortKey === key) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const {
    data: routesData,
    isLoading: routesLoading,
    error: routesQueryError,
    refetch: refetchRoutes,
  } = useQuery({
    queryKey: ['tuition', 'routes', { page: currentPage, size: pageSize, sortKey, sortDir }],
    enabled: activeTab === 'routes',
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: async () => {
      const sort = `${sortKey},${sortDir}`;
      const resp = await programApi.getAllPrograms(currentPage, pageSize, sort);
      let routesWarning: string | null = null;
      const grouped: Record<number, TuitionRouteDTO[]> = {};
      const hasMap: Record<number, boolean> = {};
      try {
        const routes = await tuitionRouteApi.getAllTuitionRoutesAsArray();
        for (const r of routes) {
          const pid = (r as any).programId as number | undefined;
          if (pid != null) {
            if (!grouped[pid]) grouped[pid] = [];
            grouped[pid].push(r);
            hasMap[pid] = true;
          }
        }
      } catch (error: any) {
        routesWarning = error?.message || 'Không thể tải danh sách lộ trình học phí';
      }
      return {
        programs: resp.content || [],
        totalPages: resp.totalPages || 0,
        totalElements: resp.totalElements || 0,
        pageNumber: resp.number ?? currentPage,
        routesByProgram: grouped,
        hasRouteMap: hasMap,
        routesWarning,
      };
    },
  });

  const toggleHistorySort = (key: 'stt'|'date'|'amount') => {
    setHistoryPage(0);
    if (historySortKey === key) setHistorySortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else {
      setHistorySortKey(key);
      setHistorySortDir(key === 'date' ? 'desc' : 'asc');
    }
  };

  const programs = routesData?.programs ?? [];
  const routesByProgram = routesData?.routesByProgram ?? {};
  const hasRouteMap = routesData?.hasRouteMap ?? {};
  const routesWarning = routesData?.routesWarning ?? null;
  useEffect(() => {
    if (typeof routesData?.pageNumber === 'number' && routesData.pageNumber !== currentPage) {
      setCurrentPage(routesData.pageNumber);
    }
    setTotalPages(routesData?.totalPages ?? 0);
    setTotalElements(routesData?.totalElements ?? 0);
  }, [routesData, currentPage]);
  const filteredPrograms = useMemo(() => {
    const kw = searchTerm.trim().toLowerCase();
    const withRoute = programs.filter(p => p.id != null && hasRouteMap[p.id!]);
    if (!kw) return withRoute;
    return withRoute.filter(p => p.name?.toLowerCase().includes(kw));
  }, [programs, searchTerm, hasRouteMap]);
  const error = routesQueryError
    ? routesQueryError instanceof Error
      ? routesQueryError.message
      : 'Không thể tải danh sách chương trình'
    : null;
  const initialLoading = routesLoading && !routesData;

  const {
    data: historyData,
    isLoading: historyLoading,
    isError: historyIsError,
    error: historyError,
  } = useQuery({
    queryKey: ['tuition', 'history', { page: historyPage, size: historySize }],
    enabled: activeTab === 'history',
    placeholderData: keepPreviousData,
    staleTime: 60_000,
    queryFn: async () => {
      const resp = await TuitionAdminService.getAdminTransactions(historyPage, historySize);
      return resp;
    },
  });

  const historyRecords: TuitionTransactionDTO[] = historyData?.content ?? [];
  const historyTotalPages = historyData?.totalPages ?? 0;
  const historyTotalElements = historyData?.totalElements ?? 0;

  const filteredHistory = useMemo(() => {
    const kw = historySearch.trim().toLowerCase();
    if (!kw) return historyRecords;
    return historyRecords.filter((t) =>
      (t.description || '').toLowerCase().includes(kw) ||
      (t.performedBy || '').toLowerCase().includes(kw)
    );
  }, [historyRecords, historySearch]);

  const sortedHistory = useMemo(() => {
    const base = [...filteredHistory];
    const dir = historySortDir === 'asc' ? 1 : -1;
    if (historySortKey === 'stt') {
      return dir === 1 ? base : base.reverse();
    }
    return base.sort((a, b) => {
      if (historySortKey === 'amount') return (Number(a.amount) - Number(b.amount)) * dir;
      const ad = new Date(a.transactionDate).getTime();
      const bd = new Date(b.transactionDate).getTime();
      return (ad - bd) * dir;
    });
  }, [filteredHistory, historySortDir, historySortKey]);

  useEffect(() => {
    const fetchActiveCoupons = async () => {
      try {
        const coupons = await couponApi.getAll();
        const now = Date.now();
        const activeCount = coupons.filter((coupon) => {
          const stillActive = coupon.active !== false;
          const notExpired = !coupon.endDate || new Date(coupon.endDate).getTime() >= now;
          const availableQuantity =
            coupon.quantity == null || (coupon.usedCount ?? 0) < coupon.quantity;
          return stillActive && notExpired && availableQuantity;
        }).length;
        setActiveCouponsCount(activeCount);
      } catch (error) {
        console.error('[TuitionAdminDashboard] Failed to load coupons', error);
        setActiveCouponsCount(0);
      }
    };
    void fetchActiveCoupons();
  }, []);

  const configuredRoutesCount = useMemo(
    () => Object.values(hasRouteMap).filter(Boolean).length,
    [hasRouteMap]
  );

  const statCards = useMemo(
    () => [
      {
        label: 'Đã cấu hình học phí',
        value: configuredRoutesCount,
        tone: 'teal' as const,
      },
      {
        label: 'Mã giảm giá còn tác dụng',
        value: activeCouponsCount,
        tone: 'emerald' as const,
      },
      {
        label: 'Giao dịch ghi nhận',
        value: historyTotalElements || sortedHistory.length || 0,
        tone: 'indigo' as const,
      },
    ],
    [activeCouponsCount, configuredRoutesCount, historyTotalElements, sortedHistory.length]
  );

  const statToneStyles = {
    teal: 'bg-teal-50 text-teal-700 border-teal-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
  } as const;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border px-4 py-3 shadow-sm ${statToneStyles[card.tone]}`}
          >
            <p className="text-xs font-semibold uppercase tracking-wide">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold">{card.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <nav className="flex flex-wrap items-center gap-2 px-4 py-3 sm:px-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('routes')}
            className={`${
              activeTab === 'routes'
                ? 'bg-teal-50 text-teal-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            } inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors`}
          >
            Danh sách học phí
          </button>
          <button
            onClick={() => setActiveTab('coupons')}
            className={`${
              activeTab === 'coupons'
                ? 'bg-teal-50 text-teal-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            } inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors`}
          >
            Mã giảm giá (Coupons)
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`${
              activeTab === 'history'
                ? 'bg-teal-50 text-teal-600'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            } inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors`}
          >
            Lịch sử giao dịch
          </button>
        </nav>
      </section>
      {activeTab === 'routes' && (
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="relative w-full max-w-sm sm:max-w-xs md:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(0);
              }}
              placeholder="Tìm kiếm lộ trình..."
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700"
            onClick={() => {
              setSelectedProgram(null);
              setModalOpen(true);
            }}
          >
            + Tạo học phí
          </button>
        </div>
      )}

      {activeTab === 'routes' && (
        <>
          {initialLoading ? (
            <TableSkeleton rows={5} columns={8} />
          ) : (
            <>
              {error && (
                <div className="bg-white rounded-lg p-6 shadow text-red-600 mb-4">{error}</div>
              )}

              <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                    <span className="flex items-center gap-2">Sắp xếp theo:</span>
                    <div className="flex items-center gap-2">
                      <button
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors ${
                          sortKey === 'id'
                            ? 'border-teal-200 bg-teal-50 text-teal-600'
                            : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        onClick={() => toggleSort('id')}
                        type="button"
                      >
                        STT {sortKey === 'id' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </button>
                      <button
                        className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm transition-colors ${
                          sortKey === 'name'
                            ? 'border-teal-200 bg-teal-50 text-teal-600'
                            : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        onClick={() => toggleSort('name')}
                        type="button"
                      >
                        Tên {sortKey === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </button>
                    </div>
                  </div>
                  <div className="ml-auto flex items-center gap-2 text-sm text-slate-600">
                    <span className="flex items-center gap-2">Kích thước trang</span>
                    <select
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                      value={pageSize}
                      onChange={(e) => {
                        const size = Number(e.target.value);
                        setPageSize(size);
                        setCurrentPage(0);
                      }}
                    >
                      {[10, 20, 50].map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {routesLoading && !routesData ? (
                  <div className="p-4">
                    <TableSkeleton rows={5} columns={8} />
                  </div>
                ) : (
                  <>
                    {routesWarning && (
                      <div className="px-5 pt-4 text-sm text-amber-600">
                        {routesWarning}
                      </div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="min-w-full border-separate border-spacing-y-2 px-5 py-4 text-sm">
                        <thead>
                          <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-4 py-2 w-16 text-center">STT</th>
                            <th className="px-4 py-2">Chương trình</th>
                            <th className="px-4 py-2">Mô tả</th>
                            <th className="px-4 py-2">Tên lộ trình</th>
                            <th className="px-4 py-2">Loại</th>
                            <th className="px-4 py-2 text-right">Tổng học phí</th>
                            <th className="px-4 py-2 text-right">Số đợt</th>
                            <th className="px-4 py-2 text-right">Thao tác</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPrograms.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-6 py-4 text-center text-gray-500">{programs.length === 0 ? 'Chưa có chương trình nào' : 'Không tìm thấy chương trình phù hợp'}</td>
                            </tr>
                          ) : filteredPrograms.map((p, idx) => {
                            const routes = p.id ? (routesByProgram[p.id] || []) : [];
                            const r = routes[0];
                            const has = !!hasRouteMap[p.id!];
                            return (
                              <tr
                                key={p.id}
                                className={`rounded-xl border border-slate-100 bg-white text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50 ${
                                  has ? 'cursor-pointer' : ''
                                }`}
                                onClick={() => {
                                  if (!has || !r) return;
                                  setSelectedProgram(p);
                                  setSelectedRoute(r);
                                  setDetailOpen(true);
                                }}
                              >
                                <td className="px-4 py-3 text-center font-semibold text-slate-600">
                                  {currentPage * pageSize + idx + 1}
                                </td>
                                <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                                <td className="px-4 py-3 text-slate-600">
                                  {p.description ? (
                                    <span className="line-clamp-2">{p.description}</span>
                                  ) : (
                                    <span className="italic text-slate-400">Chưa có mô tả</span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-slate-700">{r ? r.name : '-'}</td>
                                <td className="px-4 py-3 text-slate-700">{r ? r.type : '-'}</td>
                                <td className="px-4 py-3 text-right">
                                  {r && r.totalListedFee != null ? <CurrencyDisplay amount={Number(r.totalListedFee)} /> : '-'}
                                </td>
                                <td className="px-4 py-3 text-right">{r ? r.numberOfInstallments : '-'}</td>
                                <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                  {has && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedRoute(r)}
                                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100"
                                      title="Chỉnh sửa"
                                    >
                                      <Pencil className="h-4 w-4" />
                                      Sửa
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex flex-wrap items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
                      <span>
                        Hiển thị {filteredPrograms.length} / {totalElements} chương trình
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
                          disabled={currentPage === 0}
                        >
                          Trước
                        </button>
                        <span>
                          Trang {totalPages === 0 ? 0 : currentPage + 1} / {totalPages || 1}
                        </span>
                        <button
                          type="button"
                          className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                          onClick={() =>
                            setCurrentPage((prev) =>
                              prev + 1 >= totalPages ? prev : prev + 1
                            )
                          }
                          disabled={currentPage + 1 >= totalPages}
                        >
                          Sau
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </section>

              <CreateTuitionRouteModal
                open={modalOpen}
                program={selectedProgram}
                onClose={() => setModalOpen(false)}
                availablePrograms={programs.filter(p => p.id != null && !hasRouteMap[p.id!])}
                onCreated={(route) => {
                  void refetchRoutes();
                  setModalOpen(false);
                  setSelectedProgram(null);
                }}
              />

              <TuitionRouteDetailModal
                open={detailOpen}
                program={selectedProgram}
                route={selectedRoute}
                onClose={() => { setDetailOpen(false); setSelectedRoute(null); }}
              />

              <TuitionRouteEditModal
                open={editOpen}
                program={selectedProgram}
                route={selectedRoute}
                onClose={() => { setEditOpen(false); setSelectedRoute(null); }}
                onSaved={() => {
                  void refetchRoutes();
                  setEditOpen(false);
                  setSelectedRoute(null);
                }}
              />
            </>
          )}
        </>
      )}

      {activeTab === 'history' && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
            <span className="font-medium text-slate-500">Sắp xếp theo:</span>
            {[{ key: 'stt', label: 'STT' }, { key: 'date', label: 'Thời gian' }, { key: 'amount', label: 'Số tiền' }].map((option) => (
              <button
                key={option.key}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition-colors ${
                  historySortKey === option.key
                    ? 'border-teal-200 bg-teal-50 text-teal-600'
                    : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                onClick={() => toggleHistorySort(option.key as any)}
                type="button"
              >
                {option.label} {historySortKey === option.key ? (historySortDir === 'asc' ? '↑' : '↓') : ''}
              </button>
            ))}
            <div className="ml-auto flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
              <div className="relative w-full md:w-80">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={historySearch}
                  onChange={(e) => {
                    setHistorySearch(e.target.value);
                    setHistoryPage(0);
                  }}
                  placeholder="Tìm kiếm mô tả / người thực hiện..."
                  className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <span>Kích thước trang</span>
                <select
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={historySize}
                  onChange={(e) => {
                    setHistorySize(Number(e.target.value));
                    setHistoryPage(0);
                  }}
                >
                  {[10, 20, 50].map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {historyLoading ? (
            <div className="p-5">
              <TableSkeleton rows={5} columns={7} />
            </div>
          ) : historyIsError ? (
            <div className="p-5 text-sm text-rose-600">
              {historyError instanceof Error ? historyError.message : 'Không thể tải lịch sử giao dịch'}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border rounded-lg overflow-hidden">
                  <thead className="sticky top-0 z-10 bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-4 py-3 border">STT</th>
                      <th className="px-4 py-3 border">Thời gian</th>
                      <th className="px-4 py-3 border">Loại</th>
                      <th className="px-4 py-3 border text-right">Số tiền</th>
                      <th className="px-4 py-3 border">Người thực hiện</th>
                      <th className="px-4 py-3 border">Mô tả</th>
                      <th className="px-4 py-3 border">Biên lai</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-4 text-center text-slate-500">
                          Chưa có giao dịch
                        </td>
                      </tr>
                    ) : (
                      sortedHistory.map((t, idx) => (
                        <tr key={t.id} className="border-b border-slate-100 transition hover:bg-slate-50">
                          <td className="px-4 py-3 border">{historyPage * historySize + idx + 1}</td>
                          <td className="px-4 py-3 border">{parseBackendDate(t.transactionDate)?.toLocaleString('vi-VN') || '—'}</td>
                          <td className="px-4 py-3 border">{t.transactionType}</td>
                          <td className="px-4 py-3 border text-right">
                            <CurrencyDisplay amount={Number(t.amount)} />
                          </td>
                          <td className="px-4 py-3 border">{t.performedBy || 'Hệ thống'}</td>
                          <td className="px-4 py-3 border">{t.description || '-'}</td>
                          <td className="px-4 py-3 border">
                            {String(t.transactionType).toUpperCase() === 'PAYMENT' && t.receiptId ? (
                              <button
                                className="px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50"
                                onClick={() => {
                                  if (t.receiptId) {
                                    TuitionAdminService.downloadReceipt(t.receiptId).catch((err) =>
                                      alert(`Tải biên lai thất bại: ${err?.message || 'Lỗi không xác định'}`)
                                    );
                                  }
                                }}
                              >
                                Tải
                              </button>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
                <span>
                  Hiển thị {sortedHistory.length} / {historyTotalElements} giao dịch
                </span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => setHistoryPage((prev) => Math.max(prev - 1, 0))}
                    disabled={historyPage === 0}
                  >
                    Trước
                  </button>
                  <span>
                    {historyTotalPages === 0 ? 0 : historyPage + 1} / {historyTotalPages || 1}
                  </span>
                  <button
                    type="button"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    onClick={() => setHistoryPage((prev) => (prev + 1 >= historyTotalPages ? prev : prev + 1))}
                    disabled={historyPage + 1 >= historyTotalPages}
                  >
                    Sau
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {activeTab === 'coupons' && (
        <div className="mt-4">
          <CouponAdminPage isEmbedded />
        </div>
      )}
    </div>
  );
}
