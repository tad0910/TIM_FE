import { Fragment, useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import type { CouponDTO } from '../../services/couponApi';
import NotificationPopup from '../../components/NotificationPopup';
import { useNotification } from '../../hooks/useNotification';
import { useCreateCouponMutation } from '../../hooks/api/coupons';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const SCENARIOS = [
  { value: 'SPREAD_EVENLY', label: 'Chia đều cho các kỳ' },
  { value: 'DEDUCT_FIRST_FULL', label: 'Trừ hết vào kỳ đầu' },
  { value: 'DEDUCT_LAST_FULL', label: 'Trừ hết vào kỳ cuối' },
  { value: 'PARTIAL_FIRST_THEN_SPREAD', label: 'Trừ một phần kỳ đầu, còn lại chia đều' },
] as const;

const SCENARIO_DESCRIPTIONS: Record<FormState['scenario'], string> = {
  SPREAD_EVENLY: 'Giảm giá sẽ được phân bổ đều cho toàn bộ các kỳ thanh toán.',
  DEDUCT_FIRST_FULL: 'Toàn bộ khoản giảm sẽ áp dụng vào kỳ thanh toán đầu tiên.',
  DEDUCT_LAST_FULL: 'Khoản giảm được trừ vào kỳ đóng cuối cùng.',
  PARTIAL_FIRST_THEN_SPREAD: 'Giảm một phần ở kỳ đầu, phần còn lại được chia đều cho các kỳ tiếp theo.',
};

const CENTERS = [
  'Toàn hệ thống CodeGym',
  'CodeGym Hà Nội',
  'CodeGym Đà Nẵng',
  'CodeGym Huế',
  'CodeGym Sài Gòn',
] as const;

type FormState = {
  code: string;
  centerScope: string;
  discountType: 'AMOUNT' | 'PERCENT';
  discountValue: string;
  scenario: CouponDTO['scenario'];
  startDate: string;
  endDate: string;
  quantity: string;
  active: boolean;
  description: string;
};

const createInitialForm = (): FormState => ({
  code: '',
  centerScope: 'Toàn hệ thống CodeGym',
  discountType: 'AMOUNT',
  discountValue: '',
  scenario: 'DEDUCT_FIRST_FULL',
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  quantity: '',
  active: true,
  description: '',
});

export default function CreateCouponModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<FormState>(() => createInitialForm());
  const [error, setError] = useState<string | null>(null);
  const { notification, showSuccess, showWarning, hideNotification, showApiError } = useNotification();
  const createCoupon = useCreateCouponMutation();

  useEffect(() => {
    if (open) {
      setForm(createInitialForm());
      setError(null);
    }
  }, [open]);

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'CG';
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    setForm((prev) => ({ ...prev, code: result }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const validate = () => {
    if (!form.code || !form.startDate || !form.endDate || !form.discountValue) {
      const message = 'Vui lòng điền đầy đủ các trường bắt buộc (*)';
      setError(message);
      showWarning('Thiếu thông tin', message);
      return false;
    }
    const discountValue = Number(form.discountValue);
    if (Number.isNaN(discountValue) || discountValue <= 0) {
      const message = 'Giá trị giảm phải là số dương';
      setError(message);
      showWarning('Giá trị không hợp lệ', message);
      return false;
    }
    if (form.discountType === 'PERCENT' && (discountValue > 100 || discountValue < 0)) {
      const message = 'Phần trăm giảm giá phải từ 0 đến 100';
      setError(message);
      showWarning('Giá trị không hợp lệ', message);
      return false;
    }
    if (!form.startDate || !form.endDate || form.endDate < form.startDate) {
      const message = 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu';
      setError(message);
      showWarning('Thời gian không hợp lệ', message);
      return false;
    }
    setError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      const payload: CouponDTO = {
        code: form.code.trim(),
        centerScope: form.centerScope,
        discountType: form.discountType,
        discountValue: Number(form.discountValue),
        scenario: form.scenario,
        startDate: form.startDate,
        endDate: form.endDate,
        quantity: form.quantity ? Number(form.quantity) : undefined,
        active: form.active,
        description: form.description.trim() || undefined,
      };
      await createCoupon.mutateAsync(payload);
      showSuccess('Tạo coupon thành công', 'Mã khuyến mãi đã được tạo.');
      onCreated?.();
      onClose();
    } catch (err) {
      const message = showApiError(err, 'Có lỗi xảy ra khi tạo coupon', 'Lỗi tạo coupon');
      setError(message);
    }
  };

  return (
    <>
      <Transition appear show={open} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => {
            if (!createCoupon.isPending) onClose();
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
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all">
                  <form onSubmit={handleSubmit} className="flex h-full flex-col">
                    <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                      <div>
                        <DialogTitle className="text-lg font-semibold text-slate-900">Tạo mã khuyến mãi</DialogTitle>
                        <p className="text-xs text-slate-500 mt-1">Tùy chỉnh thông tin mã giảm giá trước khi áp dụng cho học viên.</p>
                      </div>
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-transparent p-2 text-slate-400 transition hover:border-slate-200 hover:text-slate-600"
                        disabled={createCoupon.isPending}
                      >
                        <span className="sr-only">Đóng</span>
                        <svg className="h-5 w-5" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} fill="none">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-6 py-6">
                      {error && (
                        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {error}
                        </div>
                      )}
                      <section className="rounded-2xl border border-slate-200 p-5 shadow-sm space-y-6">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="md:col-span-2">
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              Tên mã (Coupon Code) <span className="text-rose-500">*</span>
                            </label>
                            <div className="flex rounded-xl border border-slate-200">
                              <input
                                type="text"
                                name="code"
                                value={form.code}
                                onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                                className="flex-1 rounded-l-xl border-none px-3 py-2 text-sm uppercase tracking-widest text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder="VD: GIAMHOC2025"
                              />
                              <button
                                type="button"
                                onClick={generateCode}
                                className="inline-flex items-center gap-2 rounded-r-xl border-l border-slate-200 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                              >
                                <svg className="h-4 w-4" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Tự tạo
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Trung tâm áp dụng</label>
                            <select
                              name="centerScope"
                              value={form.centerScope}
                              onChange={handleChange}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                              {CENTERS.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Mô tả</label>
                            <input
                              name="description"
                              value={form.description}
                              onChange={handleChange}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                              placeholder="Tùy chọn – ghi chú nội bộ"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày bắt đầu <span className="text-rose-500">*</span></label>
                            <input
                              type="date"
                              name="startDate"
                              value={form.startDate}
                              onChange={handleChange}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Ngày kết thúc <span className="text-rose-500">*</span></label>
                            <input
                              type="date"
                              name="endDate"
                              value={form.endDate}
                              onChange={handleChange}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Loại giảm</label>
                            <select
                              name="discountType"
                              value={form.discountType}
                              onChange={handleChange}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                              <option value="AMOUNT">Số tiền (VNĐ)</option>
                              <option value="PERCENT">Phần trăm (%)</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Giá trị giảm <span className="text-rose-500">*</span></label>
                            <div className="relative">
                              <input
                                type="number"
                                name="discountValue"
                                value={form.discountValue}
                                onChange={handleChange}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2 pr-10 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder={form.discountType === 'PERCENT' ? 'VD: 10, 20' : 'VD: 500000'}
                              />
                              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-500">
                                {form.discountType === 'PERCENT' ? '%' : '₫'}
                              </span>
                            </div>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Kịch bản áp dụng</label>
                            <select
                              name="scenario"
                              value={form.scenario}
                              onChange={handleChange}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            >
                              {SCENARIOS.map((s) => (
                                <option key={s.value} value={s.value}>
                                  {s.label}
                                </option>
                              ))}
                            </select>
                            <p className="mt-1 text-xs text-slate-500">{SCENARIO_DESCRIPTIONS[form.scenario]}</p>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Số lượng mã</label>
                            <input
                              type="number"
                              name="quantity"
                              value={form.quantity}
                              onChange={handleChange}
                              placeholder="Để trống nếu không giới hạn"
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
                            />
                          </div>
                        </div>
                      </section>
                    </div>

                    <div className="flex items-center justify-end gap-3 border-t border-slate-200 px-6 py-4">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100"
                        disabled={createCoupon.isPending}
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={createCoupon.isPending}
                        className="rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-teal-700 disabled:opacity-60"
                      >
                        {createCoupon.isPending ? 'Đang tạo...' : 'Tạo coupon'}
                      </button>
                    </div>
                  </form>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
      <NotificationPopup notification={notification} onClose={hideNotification} />
    </>
  );
}
