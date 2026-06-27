import React, { Fragment, useEffect, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle, Transition, TransitionChild } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { todayString } from '../pages/admin/gradeEntryHelpers';

interface StudentOption {
  studentId: number;
  studentName: string;
}

interface GradeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    studentId: number | null;
    theoryScore: number | null;
    practiceScore: number | null;
    entryDate?: string | null;
  }) => Promise<void>;
  studentId: number | null;
  studentName: string;
  students?: StudentOption[];
  currentTheoryScore?: number | string | null;
  currentPracticeScore?: number | string | null;
  isSaving?: boolean;
  initialEntryDate?: string | null;
  notify?: {
    showWarning: (title: string, message: string) => void;
  };
}

export default function GradeEntryModal({
  isOpen,
  onClose,
  onSave,
  studentId,
  studentName,
  students = [],
  currentTheoryScore,
  currentPracticeScore,
  isSaving = false,
  initialEntryDate = todayString(),
  notify,
}: GradeEntryModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(studentId);
  const [theoryScore, setTheoryScore] = useState<string>('');
  const [practiceScore, setPracticeScore] = useState<string>('');
  const [entryDate, setEntryDate] = useState<string>(initialEntryDate || todayString());

  useEffect(() => {
    if (isOpen) {
      setSelectedStudentId(studentId);
      setTheoryScore(
        currentTheoryScore !== null && currentTheoryScore !== undefined
          ? String(currentTheoryScore)
          : ''
      );
      setPracticeScore(
        currentPracticeScore !== null && currentPracticeScore !== undefined
          ? String(currentPracticeScore)
          : ''
      );
      setEntryDate(initialEntryDate || todayString());
    }
  }, [isOpen, studentId, currentTheoryScore, currentPracticeScore, initialEntryDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedStudentId && students.length > 0) {
      if (notify?.showWarning) {
        notify.showWarning('Thiếu học viên', 'Vui lòng chọn học viên.');
      } else {
        alert('Vui lòng chọn học viên');
      }
      return;
    }

    const theory = theoryScore.trim() === '' ? null : parseFloat(theoryScore);
    const practice = practiceScore.trim() === '' ? null : parseFloat(practiceScore);

    if (theory !== null && (isNaN(theory) || theory < 0 || theory > 10)) {
      if (notify?.showWarning) {
        notify.showWarning('Điểm không hợp lệ', 'Điểm lý thuyết phải từ 0 đến 10.');
      } else {
        alert('Điểm lý thuyết phải từ 0 đến 10');
      }
      return;
    }
    if (practice !== null && (isNaN(practice) || practice < 0 || practice > 10)) {
      if (notify?.showWarning) {
        notify.showWarning('Điểm không hợp lệ', 'Điểm thực hành phải từ 0 đến 10.');
      } else {
        alert('Điểm thực hành phải từ 0 đến 10');
      }
      return;
    }
    if (!entryDate) {
      if (notify?.showWarning) {
        notify.showWarning('Thiếu ngày nhập điểm', 'Vui lòng chọn ngày nhập điểm.');
      } else {
        alert('Vui lòng chọn ngày nhập điểm');
      }
      return;
    }

    await onSave({
      studentId: selectedStudentId,
      theoryScore: theory,
      practiceScore: practice,
      entryDate,
    });
  };

  const displayStudentName = selectedStudentId
    ? students.find((s) => s.studentId === selectedStudentId)?.studentName || studentName
    : studentName || 'Chọn học viên';

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-[1200]" onClose={onClose}>
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200 transition-opacity"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150 transition-opacity"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" />
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
              <DialogPanel className="w-full max-w-md transform overflow-hidden rounded-2xl border border-slate-200 bg-white text-left align-middle shadow-2xl transition-all">
                <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
                  <DialogTitle as="h2" className="text-lg font-semibold text-slate-900">
                    Nhập điểm
                  </DialogTitle>
                  <button
                    onClick={onClose}
                    className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                    disabled={isSaving}
                    type="button"
                  >
                    <XMarkIcon className="w-5 h-5" />
                  </button>
                </div>

                <div className="px-6 py-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Học viên</label>
                    {!studentId && students.length > 0 ? (
                      <select
                        value={selectedStudentId || ''}
                        onChange={(e) => setSelectedStudentId(e.target.value ? Number(e.target.value) : null)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        disabled={isSaving}
                      >
                        <option value=""> Chọn học viên </option>
                        {students.map((student) => (
                          <option key={student.studentId} value={student.studentId}>
                            {student.studentName}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-base font-medium text-slate-900">{displayStudentName}</p>
                    )}
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Ngày nhập điểm
                        </label>
                        <input
                          type="date"
                          value={entryDate}
                          onChange={(e) => setEntryDate(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          disabled={isSaving}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Điểm lý thuyết <span className="text-slate-500">(0-10)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={theoryScore}
                          onChange={(e) => setTheoryScore(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="Nhập điểm lý thuyết"
                          disabled={isSaving}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Điểm thực hành <span className="text-slate-500">(0-10)</span>
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          step="0.1"
                          value={practiceScore}
                          onChange={(e) => setPracticeScore(e.target.value)}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          placeholder="Nhập điểm thực hành"
                          disabled={isSaving}
                        />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                        disabled={isSaving}
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:opacity-50"
                        disabled={isSaving}
                      >
                        {isSaving ? 'Đang lưu...' : 'Lưu'}
                      </button>
                    </div>
                  </form>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

