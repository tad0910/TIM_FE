import { Fragment, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import type { TuitionRouteDTO } from '../../services/tuitionRouteApi';
import type { Program } from '../../types/program';
import CurrencyDisplay from '../../components/tuition/CurrencyDisplay';
import { tuitionRouteApi } from '../../services/tuitionRouteApi';

interface Props {
  open: boolean;
  program: Program | null;
  route: TuitionRouteDTO | null;
  onClose: () => void;
}

const initialState = {
  data: null as TuitionRouteDTO | null,
  error: null as string | null,
  loading: false,
};

export default function TuitionRouteDetailModal({ open, program, route, onClose }: Props) {
  const [{ data, error, loading }, setState] = useState(initialState);

  useEffect(() => {
    const load = async () => {
      if (open && route?.id) {
        try {
          setState({ data: null, error: null, loading: true });
          const detail = await tuitionRouteApi.getById(route.id);
          setState({ data: detail, error: null, loading: false });
        } catch (e: any) {
          setState({ data: null, error: e?.message || 'Không thể tải chi tiết lộ trình', loading: false });
        }
      } else {
        setState(initialState);
      }
    };
    load();
  }, [open, route?.id]);

  const totalConfigsAmount = useMemo(() => {
    const list = (data as any)?.installmentConfigs || [];
    return list.reduce((s: number, c: any) => s + (Number(c.baseAmount) || 0), 0);
  }, [data]);

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[120]" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-slate-900/40" />
        </TransitionChild>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <DialogPanel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all">
                <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                  <div>
                    <DialogTitle className="text-lg font-semibold text-slate-900">Chi tiết lộ trình học phí</DialogTitle>
                    {program && (
                      <p className="text-sm text-slate-600">
                        Chương trình: <span className="font-medium text-slate-900">{program.name}</span>
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-transparent p-2 text-slate-400 transition hover:border-slate-200 hover:text-slate-600"
                  >
                    <span className="sr-only">Đóng</span>
                    <svg className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} fill="none">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="px-6 py-6 space-y-4 max-h-[70vh] overflow-y-auto text-sm">
                  {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</div>}
                  {loading && !data && <div className="text-slate-500">Đang tải...</div>}

                  {!!data && (
                    <>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        <DetailItem label="Tên lộ trình" value={data.name} />
                        <DetailItem label="Loại" value={data.type} />
                        <DetailItem label="Mô tả" value={data.description || '-'} />
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="grid grid-cols-2 gap-4">
                          <DetailItem
                            label="Tổng học phí (niêm yết)"
                            value={data.totalListedFee != null ? <CurrencyDisplay amount={Number(data.totalListedFee)} /> : '-'}
                          />
                          <DetailItem
                            label="Phí nhập học"
                            value={data.admissionFee != null ? <CurrencyDisplay amount={Number(data.admissionFee)} /> : '-'}
                          />
                          <DetailItem
                            label="Phí tháng đầu"
                            value={data.firstMonthFee != null ? <CurrencyDisplay amount={Number(data.firstMonthFee)} /> : '-'}
                          />
                          <DetailItem label="Số đợt" value={String(data.numberOfInstallments ?? '-')} />
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm">
                          <div className="text-sm font-semibold text-slate-900">Tóm tắt</div>
                          <div className="mt-2 space-y-1">
                            <SummaryRow label="Tổng học phí">
                              {data.totalListedFee != null ? <CurrencyDisplay amount={Number(data.totalListedFee)} /> : '-'}
                            </SummaryRow>
                            <SummaryRow label="Tổng các kỳ">
                              <CurrencyDisplay amount={Number(totalConfigsAmount || 0)} />
                            </SummaryRow>
                            {(() => {
                              const total = Number(data.totalListedFee || 0);
                              const diff = total - (totalConfigsAmount || 0);
                              const tone = diff === 0 ? 'text-emerald-600' : 'text-amber-600';
                              return (
                                <SummaryRow label="Chênh lệch" className={tone}>
                                  {diff.toLocaleString('vi-VN')}
                                </SummaryRow>
                              );
                            })()}
                          </div>
                        </div>
                      </div>

                      {Array.isArray((data as any).installmentConfigs) && (data as any).installmentConfigs.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 p-4">
                          <div className="text-sm font-semibold text-slate-900">Cấu hình các kỳ</div>
                          <div className="mt-3 overflow-x-auto">
                            <table className="min-w-full text-sm">
                              <thead>
                                <tr className="text-slate-500">
                                  <th className="px-2 py-1 text-left">Kỳ</th>
                                  <th className="px-2 py-1 text-left">Số tiền</th>
                                  <th className="px-2 py-1 text-left">Số ngày cách kỳ trước</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(data as any).installmentConfigs.map((c: any, idx: number) => (
                                  <tr key={idx} className="border-t border-slate-100">
                                    <td className="px-2 py-1">{c.installmentNumber ?? idx + 1}</td>
                                    <td className="px-2 py-1">
                                      <CurrencyDisplay amount={Number(c.baseAmount) || 0} />
                                    </td>
                                    <td className="px-2 py-1">{Number(c.daysFromPrevious) || 0}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex justify-end border-t border-slate-200 px-6 py-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                  >
                    Đóng
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

interface DetailItemProps {
  label: string;
  value: React.ReactNode;
}

const DetailItem = ({ label, value }: DetailItemProps) => (
  <div>
    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
    <div className="mt-1 text-sm font-semibold text-slate-900">{value}</div>
  </div>
);

interface SummaryRowProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

const SummaryRow = ({ label, children, className = '' }: SummaryRowProps) => (
  <div className={`flex items-center justify-between text-sm ${className}`}>
    <span className="text-slate-600">{label}</span>
    <span className="font-medium text-slate-900">{children}</span>
  </div>
);
