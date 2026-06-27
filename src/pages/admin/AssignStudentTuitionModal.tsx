import React, { Fragment, useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import tuitionRouteApi from "../../services/tuitionRouteApi";
import type { TuitionRouteDTO } from "../../services/tuitionRouteApi";
import TuitionAdminService from "../../services/tuitionAdminService";
import { couponApi, type CouponDTO } from "../../services/couponApi";
import CurrencyDisplay from "../../components/tuition/CurrencyDisplay";
import NotificationPopup from "../../components/NotificationPopup";
import { useNotification } from "../../hooks/useNotification";

interface StudentInfo {
  id: number;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  student: StudentInfo | null;
  programId?: number | null;
  programName?: string;
}

export default function AssignStudentTuitionModal({
  open,
  onClose,
  onSuccess,
  student,
  programId,
  programName,
}: Props) {
  const [routes, setRoutes] = useState<TuitionRouteDTO[]>([]);
  const [coupons, setCoupons] = useState<CouponDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    notification,
    showSuccess,
    showWarning,
    hideNotification,
    showApiError,
  } = useNotification();

  const [routeId, setRouteId] = useState<number | "">("");

  const [selectedCouponCode, setSelectedCouponCode] = useState<string>("");
  const [enrollmentDate, setEnrollmentDate] = useState<string>(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const [allRoutes, allCoupons] = await Promise.all([
          tuitionRouteApi.getAllTuitionRoutesAsArray(),
          couponApi.getAll(),
        ]);

        const filteredRoutes = (allRoutes || []).filter(
          (r) => (r as any).programId === programId
        );
        setRoutes(filteredRoutes);

        const activeCoupons = (allCoupons || []).filter((c) => c.active);
        setCoupons(activeCoupons);

        if (filteredRoutes.length > 0) {
          setRouteId((filteredRoutes[0].id as number) || "");
        } else {
          setRouteId("");
        }
      } catch (e: any) {
        const message = showApiError(
          e,
          "Không thể tải dữ liệu",
          "Lỗi tải dữ liệu học phí"
        );
        setError(message);
        setRoutes([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [open, programId]);

  useEffect(() => {
    if (!open) {
      setError(null);
      setSubmitting(false);
      setSelectedCouponCode("");
    }
  }, [open]);

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === routeId),
    [routes, routeId]
  );
  const selectedCoupon = useMemo(
    () => coupons.find((c) => c.code === selectedCouponCode),
    [coupons, selectedCouponCode]
  );

  const pricing = useMemo(() => {
    if (!selectedRoute) return null;
    const original = selectedRoute.totalListedFee || 0;
    let discount = 0;

    if (selectedCoupon) {
      if (selectedCoupon.discountType === "PERCENT") {
        discount = (original * (selectedCoupon.discountValue || 0)) / 100;
      } else {
        discount = selectedCoupon.discountValue || 0;
      }
    }
    if (discount > original) discount = original;

    return {
      original,
      discount,
      final: original - discount,
    };
  }, [selectedRoute, selectedCoupon]);

  if (!student) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student?.id || !routeId) {
      showWarning(
        "Thiếu thông tin",
        "Vui lòng chọn lộ trình học phí trước khi gán."
      );
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      await TuitionAdminService.registerStudentTuition({
        studentId: Number(student.id),
        routeId: Number(routeId),
        enrollmentDate,
        couponCode: selectedCouponCode || undefined,
      });
      showSuccess("Thành công", "Đã gán học phí cho học sinh");
      onSuccess?.();
      setTimeout(onClose, 1500);
    } catch (err: any) {
      const msg = showApiError(
        err,
        "Không thể gán học phí cho học sinh",
        "Lỗi gán học phí"
      );
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Transition appear show={open} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={onClose}>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200 transition-opacity"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150 transition-opacity"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          </TransitionChild>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200 transition-all"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150 transition-all"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-3xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl">
                  <form onSubmit={handleSubmit}>
                    <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
                      <div>
                        <DialogTitle className="text-lg font-semibold text-slate-900">
                          Gán học phí cho học viên
                        </DialogTitle>
                        <p className="text-sm text-slate-500 mt-1">
                          Học viên:{" "}
                          <span className="font-medium text-teal-700">
                            {student.name}
                          </span>
                          {programName && (
                            <>
                              <span className="text-slate-400"> • </span>
                              <span>
                                Chương trình:{" "}
                                <span className="font-medium text-slate-900">
                                  {programName}
                                </span>
                              </span>
                            </>
                          )}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-600"
                      >
                        <span className="sr-only">Đóng</span>
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                          fill="none"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>

                    <div className="px-6 py-6 space-y-6">
                      {error && (
                        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {error}
                        </div>
                      )}

                      <div className="grid gap-6 md:grid-cols-2">
                        <div className="space-y-4">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-600">
                              Lộ trình học phí{" "}
                              <span className="text-rose-500">*</span>
                            </label>
                            <select
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                              value={routeId}
                              disabled={loading}
                              onChange={(e) =>
                                setRouteId(
                                  e.target.value ? Number(e.target.value) : ""
                                )
                              }
                            >
                              {routes.length === 0 ? (
                                <option value="">
                                  {loading
                                    ? "Đang tải…"
                                    : "Không có lộ trình khả dụng"}
                                </option>
                              ) : (
                                routes.map((r) => (
                                  <option key={r.id} value={r.id as number}>
                                    {r.name} ({r.type})
                                  </option>
                                ))
                              )}
                            </select>
                          </div>

                          {selectedRoute && (
                            <div className="rounded-xl border border-teal-100 bg-teal-50/70 p-4 text-sm text-teal-900 space-y-3">
                              <div className="flex justify-between">
                                <span className="text-teal-700">
                                  Số đợt đóng:
                                </span>
                                <span className="font-semibold">
                                  {selectedRoute.numberOfInstallments} đợt
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-teal-700">Phí niêm yết:</span>
                                <span className="font-bold">
                                  <CurrencyDisplay
                                    amount={selectedRoute.totalListedFee || 0}
                                  />
                                </span>
                              </div>

                              {!!selectedRoute.installmentConfigs?.length && (
                                <div className="border-t border-teal-100 pt-3">
                                  <p className="text-xs font-semibold uppercase tracking-wide text-teal-700 mb-2">
                                    Chi tiết từng đợt
                                  </p>
                                  <div className="max-h-40 space-y-1.5 overflow-y-auto pr-1 text-xs">
                                    {selectedRoute.installmentConfigs.map(
                                      (config, index) => (
                                        <div
                                          key={index}
                                          className="flex justify-between rounded-lg bg-white/70 px-2 py-1"
                                        >
                                          <span>
                                            Đợt {config.installmentNumber}
                                            <span className="ml-1 text-slate-500">
                                              (
                                              {index === 0
                                                ? "Ngay khi đóng"
                                                : `Sau ${config.daysFromPrevious} ngày`}
                                              )
                                            </span>
                                          </span>
                                          <span className="font-medium">
                                            <CurrencyDisplay
                                              amount={config.baseAmount}
                                            />
                                          </span>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-600">
                              Ngày ghi danh
                            </label>
                            <input
                              type="date"
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                              value={enrollmentDate}
                              onChange={(e) => setEnrollmentDate(e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-600">
                              Mã giảm giá (Coupon)
                            </label>
                            <div className="relative">
                              <select
                                className="w-full appearance-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
                                value={selectedCouponCode}
                                onChange={(e) =>
                                  setSelectedCouponCode(e.target.value)
                                }
                                disabled={!routeId}
                              >
                                <option value=""> Không áp dụng </option>
                                {coupons.map((c) => (
                                  <option key={c.id} value={c.code}>
                                    {c.code} - Giảm{" "}
                                    {c.discountType === "PERCENT"
                                      ? `${c.discountValue}%`
                                      : `${c.discountValue?.toLocaleString()}đ`}
                                  </option>
                                ))}
                              </select>
                              <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
                                <svg
                                  className="h-4 w-4"
                                  viewBox="0 0 20 20"
                                  fill="currentColor"
                                >
                                  <path d="M5.23 7.21a.75.75 0 011.06.02L10 11.126l3.71-3.896a.75.75 0 111.08 1.04l-4.24 4.46a.75.75 0 01-1.08 0l-4.24-4.46a.75.75 0 01.02-1.06z" />
                                </svg>
                              </div>
                            </div>
                            {selectedCoupon && (
                              <p className="mt-1 text-xs text-emerald-600">
                                * Áp dụng mã{" "}
                                <b>{selectedCoupon.code}</b> (
                                {selectedCoupon.scenario === "DEDUCT_FIRST_FULL"
                                  ? "Trừ vào kỳ đầu"
                                  : "Chia đều các kỳ"}
                                )
                              </p>
                            )}
                          </div>

                          <div className="rounded-2xl border border-slate-200 p-4">
                            <div className="space-y-2 text-sm text-slate-600">
                              <div className="flex justify-between">
                                <span>Học phí gốc:</span>
                                <span>
                                  {pricing ? (
                                    <CurrencyDisplay
                                      amount={pricing.original}
                                    />
                                  ) : (
                                    "-"
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between text-emerald-700 font-medium">
                                <span>Giảm giá:</span>
                                <span>
                                  -{" "}
                                  {pricing ? (
                                    <CurrencyDisplay
                                      amount={pricing.discount}
                                    />
                                  ) : (
                                    "0đ"
                                  )}
                                </span>
                              </div>
                              <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-semibold text-slate-900">
                                <span>Cần thanh toán:</span>
                                <span className="text-teal-700">
                                  {pricing ? (
                                    <CurrencyDisplay amount={pricing.final} />
                                  ) : (
                                    "-"
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      >
                        Hủy bỏ
                      </button>
                      <button
                        type="submit"
                        disabled={submitting || !routeId}
                        className="inline-flex items-center justify-center rounded-lg bg-teal-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60"
                      >
                        {submitting ? (
                          <span className="flex items-center gap-2">
                            <svg
                              className="h-4 w-4 animate-spin text-white"
                              viewBox="0 0 24 24"
                              fill="none"
                            >
                              <circle
                                className="opacity-25"
                                cx="12"
                                cy="12"
                                r="10"
                                stroke="currentColor"
                                strokeWidth="4"
                              ></circle>
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                              ></path>
                            </svg>
                            Đang xử lý...
                          </span>
                        ) : (
                          "Xác nhận gán"
                        )}
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

