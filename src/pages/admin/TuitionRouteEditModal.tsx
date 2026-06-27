import { Fragment, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import tuitionRouteApi from '../../services/tuitionRouteApi';
import type { TuitionRouteDTO, InstallmentConfigDTO } from '../../services/tuitionRouteApi';
import type { Program } from '../../types/program';
import CurrencyDisplay from '../../components/tuition/CurrencyDisplay';

interface Props {
  open: boolean;
  program: Program | null;
  route: TuitionRouteDTO | null;
  onClose: () => void;
  onSaved?: (route: TuitionRouteDTO) => void;
}

type FormState = {
  id: number | null;
  programId: number | null;
  name: string;
  type: string;
  admissionFee: string;
  firstMonthFee: string;
  totalListedFee: string;
  numberOfInstallments: string;
  description: string;
};

const createFormFromRoute = (route: TuitionRouteDTO | null, fallbackProgramId: number | null): FormState => ({
  id: route?.id ?? null,
  programId: route?.programId ?? fallbackProgramId ?? null,
  name: route?.name || '',
  type: route?.type || 'FULL_TIME',
  admissionFee: route?.admissionFee != null ? String(route.admissionFee) : '',
  firstMonthFee: route?.firstMonthFee != null ? String(route.firstMonthFee) : '',
  totalListedFee: route?.totalListedFee != null ? String(route.totalListedFee) : '',
  numberOfInstallments: route?.numberOfInstallments != null ? String(route.numberOfInstallments) : '',
  description: route?.description || '',
});

export default function TuitionRouteEditModal({ open, program, route, onClose, onSaved }: Props) {
  const [form, setForm] = useState<FormState | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [installmentConfigs, setInstallmentConfigs] = useState<InstallmentConfigDTO[]>([]);

  useEffect(() => {
    const load = async () => {
      if (open && route?.id) {
        try {
          setSubmitting(false);
          setError(null);
          setErrors({});
          const full = await tuitionRouteApi.getById(route.id);
          setForm(createFormFromRoute(full, program?.id ?? null));
          setInstallmentConfigs(full.installmentConfigs || []);
        } catch (e: any) {
          setForm(null);
          setInstallmentConfigs([]);
          setError(e?.message || 'Không thể tải chi tiết lộ trình');
        }
      } else {
        setForm(null);
        setInstallmentConfigs([]);
        setErrors({});
        setError(null);
        setSubmitting(false);
      }
    };
    load();
  }, [open, route?.id, program?.id]);

  const totalConfigsAmount = useMemo(() => installmentConfigs.reduce((s, c) => s + (Number(c.baseAmount) || 0), 0), [installmentConfigs]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (!form) return;
    const numericFields: Array<keyof FormState> = ['admissionFee', 'firstMonthFee', 'totalListedFee', 'numberOfInstallments'];
    if (numericFields.includes(name as keyof FormState)) {
      const digitsOnly = value.replace(/[^0-9]/g, '');
      setForm((prev) => (prev ? { ...prev, [name]: digitsOnly } : prev));
      setErrors((prev) => ({ ...prev, [name]: '' }));
      if (name === 'numberOfInstallments') {
        const n = parseInt(digitsOnly || '0', 10);
        setInstallmentConfigs((prev) =>
          Array.from({ length: Math.max(0, n) }, (_, i) => ({
            installmentNumber: i + 1,
            baseAmount: prev[i]?.baseAmount ?? 0,
            daysFromPrevious: prev[i]?.daysFromPrevious ?? 30,
          }))
        );
      }
    } else {
      setForm((prev) => (prev ? { ...prev, [name]: value } : prev));
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const v: Record<string, string> = {};
    if (!String(form?.name || '').trim()) v.name = 'Vui lòng nhập tên lộ trình';
    if (!String(form?.type || '').trim()) v.type = 'Vui lòng nhập loại lộ trình';
    const totalListedFee = String(form?.totalListedFee || '');
    const numberOfInstallments = String(form?.numberOfInstallments || '');
    if (!totalListedFee) v.totalListedFee = 'Vui lòng nhập tổng học phí';
    if (!numberOfInstallments) v.numberOfInstallments = 'Vui lòng nhập số đợt';
    if (totalListedFee && !/^[0-9]+$/.test(totalListedFee)) v.totalListedFee = 'Chỉ nhập số nguyên không âm';
    if (numberOfInstallments && (!/^[0-9]+$/.test(numberOfInstallments) || parseInt(numberOfInstallments) < 1)) v.numberOfInstallments = 'Số đợt phải là số nguyên >= 1';
    const admissionFee = String(form?.admissionFee || '');
    const firstMonthFee = String(form?.firstMonthFee || '');
    if (admissionFee && !/^[0-9]+$/.test(admissionFee)) v.admissionFee = 'Chỉ nhập số nguyên không âm';
    if (firstMonthFee && !/^[0-9]+$/.test(firstMonthFee)) v.firstMonthFee = 'Chỉ nhập số nguyên không âm';

    const n = parseInt(numberOfInstallments || '0', 10);
    const total = parseInt(totalListedFee || '0', 10);
    if (n > 0) {
      if (installmentConfigs.length !== n) {
        v.installmentConfigs = `Cần cấu hình đúng ${n} kỳ`;
      } else {
        const sum = installmentConfigs.reduce((s, c) => s + (Number(c.baseAmount) || 0), 0);
        if (sum !== total) {
          v.installmentConfigs = `Tổng tiền các kỳ (${sum.toLocaleString('vi-VN')}) phải bằng tổng học phí (${total.toLocaleString('vi-VN')})`;
        }
        for (let i = 0; i < installmentConfigs.length; i++) {
          const it = installmentConfigs[i];
          if (it.installmentNumber !== i + 1) {
            v.installmentConfigs = 'Số kỳ phải liên tục từ 1 đến ' + n;
            break;
          }
          if (Number.isNaN(Number(it.baseAmount)) || Number(it.baseAmount) < 0) {
            v.installmentConfigs = 'Số tiền mỗi kỳ phải là số >= 0';
            break;
          }
          if (!Number.isInteger(Number(it.daysFromPrevious)) || Number(it.daysFromPrevious) < 0) {
            v.installmentConfigs = 'Khoảng cách ngày giữa các kỳ phải là số nguyên >= 0';
            break;
          }
        }
      }
    }
    setErrors(v);
    return v;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form?.id) return;
    try {
      setSubmitting(true);
      setError(null);
      const v = validate();
      if (Object.keys(v).length > 0) {
        setSubmitting(false);
        return;
      }
      const toInt = (val: string) => (val === '' || val === undefined ? undefined : parseInt(String(val), 10));
      const payload: TuitionRouteDTO = {
        programId: form.programId ?? program?.id,
        name: String(form.name || ''),
        type: String(form.type || ''),
        admissionFee: toInt(form.admissionFee),
        firstMonthFee: toInt(form.firstMonthFee),
        totalListedFee: parseInt(String(form.totalListedFee), 10),
        numberOfInstallments: parseInt(String(form.numberOfInstallments), 10),
        description: String(form.description || ''),
        installmentConfigs: installmentConfigs.map((c, idx) => ({
          installmentNumber: idx + 1,
          baseAmount: Number(c.baseAmount) || 0,
          daysFromPrevious: Number(c.daysFromPrevious) || 0,
        })),
      };
      const updated = await tuitionRouteApi.updateRoute(form.id!, payload);
      onSaved?.(updated);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Không thể cập nhật lộ trình học phí');
    } finally {
      setSubmitting(false);
    }
  };

  const autoDistribute = () => {
    if (!form) return;
    const n = parseInt(String(form.numberOfInstallments || 0), 10);
    const total = parseInt(String(form.totalListedFee || 0), 10);
    if (!n || !total) return;
    const base = Math.floor(total / n);
    let remainder = total - base * n;
    const next = Array.from({ length: n }, (_, i) => {
      const extra = remainder > 0 ? 1 : 0;
      remainder -= extra;
      return {
        installmentNumber: i + 1,
        baseAmount: base + extra,
        daysFromPrevious: installmentConfigs[i]?.daysFromPrevious ?? 30,
      } as InstallmentConfigDTO;
    });
    setInstallmentConfigs(next);
    setErrors((prev) => ({ ...prev, installmentConfigs: '' }));
  };

  const applyPreset = (n: number) => {
    if (!form) return;
    setForm((prev) => (prev ? { ...prev, numberOfInstallments: String(n) } : prev));
    setInstallmentConfigs((prev) =>
      Array.from({ length: n }, (_, i) => ({
        installmentNumber: i + 1,
        baseAmount: prev[i]?.baseAmount ?? 0,
        daysFromPrevious: prev[i]?.daysFromPrevious ?? 30,
      }))
    );
    const total = parseInt(String(form.totalListedFee || 0), 10);
    if (total) {
      const base = Math.floor(total / n);
      let remainder = total - base * n;
      setInstallmentConfigs((prev) =>
        prev.map((item, idx) => {
          const extra = remainder > 0 ? 1 : 0;
          remainder -= extra;
          return { ...item, baseAmount: base + extra };
        })
      );
    }
    setErrors((prev) => ({ ...prev, installmentConfigs: '' }));
  };

  const clearConfigs = () => {
    setInstallmentConfigs([]);
    setForm((prev) => (prev ? { ...prev, numberOfInstallments: '' } : prev));
    setErrors((prev) => ({ ...prev, installmentConfigs: '' }));
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[130]" onClose={() => {
        if (!submitting) onClose();
      }}>
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
              <DialogPanel className="w-full max-w-5xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all">
                <form onSubmit={handleSubmit} className="flex h-full flex-col">
                  <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                    <div>
                      <DialogTitle className="text-lg font-semibold text-slate-900">Chỉnh sửa học phí</DialogTitle>
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
                      disabled={submitting}
                    >
                      <span className="sr-only">Đóng</span>
                      <svg className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} fill="none">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                    {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
                    {!form && !error && <div className="text-sm text-slate-500">Đang tải dữ liệu...</div>}
                    {form && (
                      <>
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          Việc chỉnh sửa lộ trình học phí sẽ không ảnh hưởng tới các học viên đã được gán trước đó. Thay đổi chỉ áp dụng cho các gán mới sau thời điểm lưu.
                        </div>

                        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                          <div className="space-y-6">
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                              <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Tên lộ trình</label>
                                <input
                                  name="name"
                                  value={form.name}
                                  onChange={handleChange}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  placeholder="VD: Java Fullstack - Route 2025"
                                />
                                {errors.name && <div className="mt-1 text-xs text-rose-600">{errors.name}</div>}
                              </div>
                              <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">Loại lộ trình</label>
                                <select
                                  name="type"
                                  value={form.type}
                                  onChange={handleChange}
                                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                >
                                  <option value="FULL_TIME">FULL_TIME</option>
                                  <option value="PART_TIME">PART_TIME</option>
                                </select>
                                {errors.type && <div className="mt-1 text-xs text-rose-600">{errors.type}</div>}
                              </div>
                              <div className="md:col-span-2">
                                <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
                                <input
                                  name="description"
                                  value={form.description}
                                  onChange={handleChange}
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                  placeholder="Ghi chú..."
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                              <NumericField
                                label="Phí nhập học"
                                name="admissionFee"
                                value={form.admissionFee}
                                onChange={handleChange}
                                error={errors.admissionFee}
                              />
                              <NumericField
                                label="Phí tháng đầu"
                                name="firstMonthFee"
                                value={form.firstMonthFee}
                                onChange={handleChange}
                                error={errors.firstMonthFee}
                              />
                              <NumericField
                                label="Tổng học phí (niêm yết)"
                                name="totalListedFee"
                                value={form.totalListedFee}
                                onChange={handleChange}
                                error={errors.totalListedFee}
                              />
                              <NumericField
                                label="Số đợt (kỳ)"
                                name="numberOfInstallments"
                                value={form.numberOfInstallments}
                                onChange={handleChange}
                                error={errors.numberOfInstallments}
                              />
                            </div>

                            {parseInt(String(form.numberOfInstallments || 0), 10) > 0 && (
                              <div className="rounded-2xl border border-slate-200 p-4">
                                <div className="mb-3 text-sm font-semibold text-slate-900">Cấu hình các kỳ</div>
                                <div className="overflow-x-auto">
                                  <table className="min-w-full text-sm">
                                    <thead>
                                      <tr className="text-slate-500">
                                        <th className="px-2 py-1 text-left">Kỳ</th>
                                        <th className="px-2 py-1 text-left">Số tiền</th>
                                        <th className="px-2 py-1 text-left">Số ngày cách kỳ trước</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {installmentConfigs.map((c, idx) => (
                                        <tr key={idx} className="border-t border-slate-100">
                                          <td className="px-2 py-1">{idx + 1}</td>
                                          <td className="px-2 py-1">
                                            <input
                                              value={c.baseAmount ?? 0}
                                              onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                setInstallmentConfigs((prev) =>
                                                  prev.map((pc, i) => (i === idx ? { ...pc, baseAmount: Number(val || 0) } : pc))
                                                );
                                                setErrors((prev) => ({ ...prev, installmentConfigs: '' }));
                                              }}
                                              inputMode="numeric"
                                              pattern="[0-9]*"
                                              className="w-40 rounded-lg border border-slate-200 px-2 py-1 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                            {Number(c.baseAmount) > 0 && (
                                              <div className="mt-1 text-xs text-slate-500">
                                                ≈ <CurrencyDisplay amount={Number(c.baseAmount)} />
                                              </div>
                                            )}
                                          </td>
                                          <td className="px-2 py-1">
                                            <input
                                              value={c.daysFromPrevious ?? 0}
                                              onChange={(e) => {
                                                const val = e.target.value.replace(/[^0-9]/g, '');
                                                setInstallmentConfigs((prev) =>
                                                  prev.map((pc, i) => (i === idx ? { ...pc, daysFromPrevious: Number(val || 0) } : pc))
                                                );
                                                setErrors((prev) => ({ ...prev, installmentConfigs: '' }));
                                              }}
                                              inputMode="numeric"
                                              pattern="[0-9]*"
                                              className="w-40 rounded-lg border border-slate-200 px-2 py-1 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <div className="mt-2 text-xs text-slate-500">Tổng các kỳ: {totalConfigsAmount.toLocaleString('vi-VN')}</div>
                                {errors.installmentConfigs && <div className="mt-1 text-xs text-rose-600">{errors.installmentConfigs}</div>}
                              </div>
                            )}
                          </div>

                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                            <div className="text-sm font-semibold text-slate-900">Tóm tắt</div>
                            <div className="mt-2 space-y-1 text-sm">
                              <SummaryRow label="Tổng học phí">
                                {form.totalListedFee ? <CurrencyDisplay amount={Number(form.totalListedFee)} /> : '-'}
                              </SummaryRow>
                              <SummaryRow label="Tổng các kỳ">
                                <CurrencyDisplay amount={Number(totalConfigsAmount || 0)} />
                              </SummaryRow>
                              {(() => {
                                const total = parseInt(String(form.totalListedFee || 0), 10) || 0;
                                const diff = total - (totalConfigsAmount || 0);
                                const tone = diff === 0 ? 'text-emerald-600' : 'text-amber-600';
                                return (
                                  <SummaryRow label="Chênh lệch" className={tone}>
                                    {diff.toLocaleString('vi-VN')}
                                  </SummaryRow>
                                );
                              })()}
                            </div>

                            <div className="mt-4 space-y-2 text-xs text-slate-500">
                              <span>Preset kỳ:</span>
                              <div className="flex flex-wrap gap-2">
                                {[1, 3, 6, 12].map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    className="rounded-full border border-slate-200 px-3 py-1 font-medium text-slate-600 transition hover:bg-slate-100"
                                    onClick={() => applyPreset(n)}
                                  >
                                    {n} kỳ
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={autoDistribute}
                                className="rounded-full border border-teal-200 px-3 py-1.5 text-sm font-medium text-teal-700 transition hover:bg-teal-50"
                              >
                                Chia đều theo tổng học phí
                              </button>
                              <button
                                type="button"
                                onClick={clearConfigs}
                                className="rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                              >
                                Xóa cấu hình
                              </button>
                            </div>
                          </div>
                        </div>
                      </>)
                    }
                  </div>

                  <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                      disabled={submitting}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || !form}
                      className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-teal-700 disabled:opacity-60"
                    >
                      {submitting ? 'Đang lưu...' : 'Lưu thay đổi'}
                    </button>
                  </div>
                </form>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

interface NumericFieldProps {
  label: string;
  name: string;
  value: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  error?: string;
}

const NumericField = ({ label, name, value, onChange, error }: NumericFieldProps) => (
  <div>
    <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
    <input
      name={name}
      value={value}
      onChange={onChange}
      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
      inputMode="numeric"
      pattern="[0-9]*"
    />
    {error && <div className="mt-1 text-xs text-rose-600">{error}</div>}
  </div>
);

interface SummaryRowProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

const SummaryRow = ({ label, children, className }: SummaryRowProps) => (
  <div className={`flex items-center justify-between text-sm py-1 ${className}`}>
    <span className="text-slate-600">{label}</span>
    <span className="font-medium">{children}</span>
  </div>
);
