import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminPageHeader from '../../components/AdminPageHeader';
import TableSkeleton from '../../components/TableSkeleton';
import CreateCouponModal from './CreateCouponModal';
import CurrencyDisplay from '../../components/tuition/CurrencyDisplay';
import type { CouponDTO } from '../../services/couponApi';
import { useCouponsQuery } from '../../hooks/api/coupons';
import { Search } from 'lucide-react';
import { useAdminHeader } from '../../components/admin/layout/AdminShell';

interface Props {
  isEmbedded?: boolean;
}

export default function CouponAdminPage({ isEmbedded = false }: Props) {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<'code' | 'endDate' | 'discount' | 'status'>('code');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const {
    data: coupons = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useCouponsQuery();

  const toggleSort = (key: 'code' | 'endDate' | 'discount' | 'status') => {
    if (sortKey === key) setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filteredCoupons = useMemo(() => {
    const kw = searchTerm.trim().toLowerCase();
    if (!kw) return coupons;
    return coupons.filter(
      (c) =>
        (c.code || '').toLowerCase().includes(kw) ||
        (c.centerScope || '').toLowerCase().includes(kw) ||
        (c.scenario || '').toLowerCase().includes(kw)
    );
  }, [coupons, searchTerm]);

  const sortedCoupons = useMemo(() => {
    const base = [...filteredCoupons];
    const dir = sortDir === 'asc' ? 1 : -1;
    base.sort((a, b) => {
      if (sortKey === 'code') return ((a.code || '').localeCompare(b.code || '')) * dir;
      if (sortKey === 'endDate') {
        const ad = a.endDate ? new Date(a.endDate).getTime() : 0;
        const bd = b.endDate ? new Date(b.endDate).getTime() : 0;
        return (ad - bd) * dir;
      }
      if (sortKey === 'discount') {
        const av = Number(a.discountValue || 0);
        const bv = Number(b.discountValue || 0);
        return (av - bv) * dir;
      }
      return ((a.active ? 1 : 0) - (b.active ? 1 : 0)) * dir;
    });
    return base;
  }, [filteredCoupons, sortKey, sortDir]);

  const paginated = useMemo(() => {
    const safePage = Math.max(0, page);
    const safeSize = Math.max(1, pageSize);
    const start = safePage * safeSize;
    const end = start + safeSize;
    const items = sortedCoupons.slice(start, end);
    const totalPages = Math.max(1, Math.ceil(sortedCoupons.length / safeSize));
    return {
      items,
      totalPages,
    };
  }, [sortedCoupons, page, pageSize]);

  return (
    <div className="space-y-4">
      {!isEmbedded && (
        <AdminPageHeader
          breadcrumbs={[
            { label: 'Quản trị', onClick: () => navigate('/admin') },
            { label: 'Mã giảm giá', onClick: () => navigate('/admin/coupons'), active: true },
          ]}
          title="Quản lý Mã Giảm Giá"
          chips={[
            { label: 'Tổng số', value: coupons.length },
            { label: 'Đang hoạt động', value: coupons.filter((c) => c.active).length, tone: 'green' },
          ]}
        />
      )}

      <div className="flex flex-wrap items-center justify-end gap-3">
        <div className="relative w-full md:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm mã / center / scenario..."
            className="w-full rounded-lg border border-slate-200 pl-9 pr-4 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-700"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          Tạo Coupon
        </button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-5 py-4 text-sm text-slate-600">
          <span className="font-medium text-slate-500">Sắp xếp theo:</span>
          {[{ key: 'code', label: 'Mã' }, { key: 'endDate', label: 'Thời hạn' }, { key: 'discount', label: 'Giảm giá' }, { key: 'status', label: 'Trạng thái' }].map(
            (option) => (
              <button
                key={option.key}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 transition-colors ${
                  sortKey === option.key
                    ? 'border-teal-200 bg-teal-50 text-teal-600'
                    : 'border-transparent bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                onClick={() => toggleSort(option.key as any)}
                type="button"
              >
                {option.label} {sortKey === option.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </button>
            )
          )}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-slate-600">Kích thước trang</span>
            <select
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
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

        {isError && (
          <div className="px-5 py-4 text-sm text-rose-600">
            {error?.message || 'Không thể tải danh sách coupon'}
          </div>
        )}

        {isLoading ? (
          <div className="p-5">
            <TableSkeleton rows={5} columns={6} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 px-5 py-4 text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-2">Mã Coupon</th>
                  <th className="px-4 py-2">Giảm giá</th>
                  <th className="px-4 py-2">Phạm vi</th>
                  <th className="px-4 py-2">Thời hạn</th>
                  <th className="px-4 py-2 text-center">SL / Đã dùng</th>
                  <th className="px-4 py-2 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {paginated.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-slate-500">
                      Chưa có coupon nào được tạo.
                    </td>
                  </tr>
                ) : (
                  paginated.items.map((coupon: CouponDTO) => (
                    <tr
                      key={coupon.id ?? coupon.code}
                      className="rounded-xl border border-slate-100 bg-white text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50"
                    >
                      <td className="px-4 py-3 font-semibold text-teal-700 font-mono">{coupon.code}</td>
                      <td className="px-4 py-3">
                        {coupon.discountType === 'PERCENT' ? (
                          <span className="font-semibold text-emerald-600">{coupon.discountValue}%</span>
                        ) : (
                          <span className="font-semibold text-emerald-600">
                            <CurrencyDisplay amount={coupon.discountValue} />
                          </span>
                        )}
                        <div className="text-xs text-slate-400">
                          {coupon.discountType === 'AMOUNT' ? 'Trừ trực tiếp' : 'Theo phần trăm'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{coupon.centerScope}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">
                        <div>Từ: {coupon.startDate}</div>
                        <div>Đến: {coupon.endDate}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {coupon.quantity ? (
                          <span>
                            {coupon.usedCount || 0} / {coupon.quantity}
                          </span>
                        ) : (
                          <span className="text-slate-400">Không giới hạn</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            coupon.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {coupon.active ? 'Hoạt động' : 'Đã ẩn'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-600">
          <span>
            Hiển thị {paginated.items.length} / {sortedCoupons.length} coupon
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span>Trang:</span>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                disabled={page === 0}
              >
                Trước
              </button>
              <span>
                {paginated.totalPages === 0 ? 0 : page + 1} / {paginated.totalPages || 1}
              </span>
              <button
                type="button"
                className="rounded-lg border border-slate-200 px-3 py-1.5 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() =>
                  setPage((prev) => (prev + 1 >= paginated.totalPages ? prev : prev + 1))
                }
                disabled={page + 1 >= paginated.totalPages}
              >
                Sau
              </button>
            </div>
          </div>
        </div>
      </section>

      <CreateCouponModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={() => {
          void refetch();
        }}
      />
    </div>
  );
}
