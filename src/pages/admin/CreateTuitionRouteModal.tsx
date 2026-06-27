import { Fragment, useEffect, useMemo, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import tuitionRouteApi from '../../services/tuitionRouteApi';
import type { TuitionRouteDTO, InstallmentConfigDTO } from '../../services/tuitionRouteApi';
import type { Program } from '../../types/program';
import { programApi } from '../../services/programApi';
import CurrencyDisplay from '../../components/tuition/CurrencyDisplay';

type FormState = {
  name: string;
  type: string;
  admissionFee: string;
  firstMonthFee: string;
  totalListedFee: string;
  numberOfInstallments: string;
  description: string;
};

interface Props {
  open: boolean;
  program: Program | null;
  onClose: () => void;
  onCreated?: (route: TuitionRouteDTO) => void;
  availablePrograms?: Program[];
}

const createInitialForm = (targetProgram: Program | null): FormState => ({
  name: targetProgram ? `${targetProgram.name} - Route` : '',
  type: 'FULL_TIME',
  admissionFee: '',
  firstMonthFee: '',
  totalListedFee: '',
  numberOfInstallments: '',
  description: '',
});

export default function CreateTuitionRouteModal({ open, program, onClose, onCreated, availablePrograms }: Props) {
  const [form, setForm] = useState<FormState>(() => createInitialForm(program));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [installmentConfigs, setInstallmentConfigs] = useState<InstallmentConfigDTO[]>([]);
  const [programList, setProgramList] = useState<Program[]>([]);
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(program?.id ?? null);

  const resetState = () => {
    setForm(createInitialForm(program));
    setErrors({});
    setError(null);
    setSubmitting(false);
    setInstallmentConfigs([]);
    setSelectedProgramId(program?.id ?? null);
  };

  useEffect(() => {
    if (open) {
      resetState();
      if (availablePrograms && availablePrograms.length > 0) {
        setProgramList(availablePrograms);
      } else {
        programApi
          .getAllProgramsAsArray()
          .then(setProgramList)
          .catch(() => setProgramList([]));
      }
    }
  }, [open, program, availablePrograms]);

  const handleProgramChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    setSelectedProgramId(value ? Number(value) : null);
    setErrors((prev) => ({ ...prev, programId: '' }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numericFields: Array<keyof FormState> = ['admissionFee', 'firstMonthFee', 'totalListedFee', 'numberOfInstallments'];
    if (numericFields.includes(name as keyof FormState)) {
      const digitsOnly = value.replace(/[^0-9]/g, '');
      setForm((prev) => ({ ...prev, [name]: digitsOnly }));
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
      setForm((prev) => ({ ...prev, [name]: value }));
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const totalConfigsAmount = useMemo(() => installmentConfigs.reduce((s, c) => s + (Number(c.baseAmount) || 0), 0), [installmentConfigs]);

  const autoDistribute = (nArg?: number, totalArg?: number) => {
    const n = nArg ?? parseInt(String(form.numberOfInstallments || 0), 10);
    const total = totalArg ?? parseInt(String(form.totalListedFee || 0), 10);
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

  const applyInstallmentsCount = (n: number, distribute = true) => {
    if (n < 0) n = 0;
    setForm((prev) => ({ ...prev, numberOfInstallments: String(n) }));
    setInstallmentConfigs((prev) =>
      Array.from({ length: n }, (_, i) => ({
        installmentNumber: i + 1,
        baseAmount: prev[i]?.baseAmount ?? 0,
        daysFromPrevious: prev[i]?.daysFromPrevious ?? 30,
      }))
    );
    if (distribute) {
      const total = parseInt(String(form.totalListedFee || 0), 10);
      autoDistribute(n, total);
    }
  };

  const clearConfigs = () => {
    setInstallmentConfigs([]);
    setForm((prev) => ({ ...prev, numberOfInstallments: '' }));
    setErrors((prev) => ({ ...prev, installmentConfigs: '' }));
  };

  const validate = () => {
    const v: Record<string, string> = {};
    if (!selectedProgramId) v.programId = 'Vui lòng chọn chương trình';
    if (!String(form.name || '').trim()) v.name = 'Vui lòng nhập tên lộ trình';
    if (!String(form.type || '').trim()) v.type = 'Vui lòng nhập loại lộ trình';
    const totalListedFee = String(form.totalListedFee || '');
    const numberOfInstallments = String(form.numberOfInstallments || '');
    if (!totalListedFee) v.totalListedFee = 'Vui lòng nhập tổng học phí';
    if (!numberOfInstallments) v.numberOfInstallments = 'Vui lòng nhập số đợt';
    if (totalListedFee && !/^\d+$/.test(totalListedFee)) v.totalListedFee = 'Chỉ nhập số nguyên không âm';
    if (numberOfInstallments && (!/^\d+$/.test(numberOfInstallments) || parseInt(numberOfInstallments) < 1)) v.numberOfInstallments = 'Số đợt phải là số nguyên >= 1';
    const admissionFee = String(form.admissionFee || '');
    const firstMonthFee = String(form.firstMonthFee || '');
    if (admissionFee && !/^\d+$/.test(admissionFee)) v.admissionFee = 'Chỉ nhập số nguyên không âm';
    if (firstMonthFee && !/^\d+$/.test(firstMonthFee)) v.firstMonthFee = 'Chỉ nhập số nguyên không âm';

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

  const handleCancel = () => {
    resetState();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
        programId: selectedProgramId ?? program?.id,
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

      const created = await tuitionRouteApi.createRoute(payload);
      onCreated?.(created);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Không thể tạo lộ trình học phí');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-[100]"
        onClose={() => {
          if (!submitting) handleCancel();
        }}
      >
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
                      <DialogTitle className="text-lg font-semibold text-slate-900">Tạo học phí cho chương trình</DialogTitle>
                      {program && (
                        <p className="text-sm text-slate-600">
                          Chương trình mặc định: <span className="font-medium text-slate-900">{program.name}</span>
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleCancel}
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

                    <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
                      <div className="space-y-6">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-slate-700">Chương trình</label>
                            <select
                              value={selectedProgramId ?? ''}
                              onChange={handleProgramChange}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                              <option value="">{program ? `Sử dụng chương trình mặc định (${program.name})` : 'Chọn chương trình'}</option>
                              {programList.map((p) => (
                                <option key={p.id} value={p.id ?? undefined}>
                                  {p.name}
                                </option>
                              ))}
                            </select>
                            {errors.programId && <div className="mt-1 text-xs text-rose-600">{errors.programId}</div>}
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Tên lộ trình</label>
                            <input
                              name="name"
                              value={form.name}
                              onChange={handleChange}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder="VD: Fullstack 2025"
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
                        </div>

                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Phí nhập học</label>
                            <input
                              name="admissionFee"
                              value={form.admissionFee}
                              onChange={handleChange}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder="0"
                            />
                            {errors.admissionFee && <div className="mt-1 text-xs text-rose-600">{errors.admissionFee}</div>}
                            {form.admissionFee && (
                              <div className="mt-1 text-xs text-slate-500">
                                ≈ <CurrencyDisplay amount={Number(form.admissionFee)} />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Phí tháng đầu</label>
                            <input
                              name="firstMonthFee"
                              value={form.firstMonthFee}
                              onChange={handleChange}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder="0"
                            />
                            {errors.firstMonthFee && <div className="mt-1 text-xs text-rose-600">{errors.firstMonthFee}</div>}
                            {form.firstMonthFee && (
                              <div className="mt-1 text-xs text-slate-500">
                                ≈ <CurrencyDisplay amount={Number(form.firstMonthFee)} />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Tổng học phí</label>
                            <input
                              name="totalListedFee"
                              value={form.totalListedFee}
                              onChange={handleChange}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder="0"
                            />
                            {errors.totalListedFee && <div className="mt-1 text-xs text-rose-600">{errors.totalListedFee}</div>}
                            {form.totalListedFee && (
                              <div className="mt-1 text-xs text-slate-500">
                                ≈ <CurrencyDisplay amount={Number(form.totalListedFee)} />
                              </div>
                            )}
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Số đợt (kỳ)</label>
                            <input
                              name="numberOfInstallments"
                              value={form.numberOfInstallments}
                              onChange={handleChange}
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder="0"
                            />
                            {errors.numberOfInstallments && <div className="mt-1 text-xs text-rose-600">{errors.numberOfInstallments}</div>}
                          </div>
                        </div>

                        <div>
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

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <div className="text-sm font-semibold text-slate-900">Tóm tắt</div>
                        <div className="mt-2 space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">Tổng học phí</span>
                            <span className="font-semibold text-slate-900">
                              {form.totalListedFee ? <CurrencyDisplay amount={Number(form.totalListedFee)} /> : '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-600">Tổng các kỳ</span>
                            <span className="font-semibold text-slate-900">
                              <CurrencyDisplay amount={Number(totalConfigsAmount || 0)} />
                            </span>
                          </div>
                          {(() => {
                            const total = parseInt(String(form.totalListedFee || 0), 10) || 0;
                            const diff = total - (totalConfigsAmount || 0);
                            const tone = diff === 0 ? 'text-emerald-600' : 'text-amber-600';
                            return (
                              <div className={`flex items-center justify-between ${tone}`}>
                                <span>Sự chênh lệch</span>
                                <span className="font-medium">{diff.toLocaleString('vi-VN')}</span>
                              </div>
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
                                onClick={() => applyInstallmentsCount(n, true)}
                              >
                                {n} kỳ
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => autoDistribute()}
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

                    {parseInt(String(form.numberOfInstallments || 0), 10) > 0 && (
                      <div className="rounded-2xl border border-slate-200 p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div className="text-sm font-semibold text-slate-900">Cấu hình các kỳ</div>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm text-slate-700">
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

                  <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                      disabled={submitting}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-teal-700 disabled:opacity-60"
                    >
                      {submitting ? 'Đang tạo...' : 'Tạo học phí'}
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