import { Dialog } from '@headlessui/react';
import { format } from 'date-fns';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import '../fontawesome';
import type { EventCalendar } from './ScheduleCalendar';

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: EventCalendar | null;
}

export default function SessionDetailModal({ isOpen, onClose, session }: SessionDetailModalProps) {
  if (!session) return null;

  const formatDateTime = (date: Date) => {
    return format(date, "dd/MM/yyyy HH:mm");
  };

  const formatTime = (date: Date) => {
    return format(date, "HH:mm");
  };

  const getStatusBadge = (status?: string) => {
    if (!status) return null;
    const statusMap: Record<string, { label: string; color: string }> = {
      planned: { label: "Đã lên kế hoạch", color: "bg-blue-100 text-blue-800" },
      ongoing: { label: "Đang diễn ra", color: "bg-green-100 text-green-800" },
      completed: { label: "Đã hoàn thành", color: "bg-gray-100 text-gray-800" },
    };
    const statusInfo = statusMap[status.toLowerCase()] || { label: status, color: "bg-gray-100 text-gray-800" };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  const durationMs = session.end.getTime() - session.start.getTime();
  const durationMinutes = Math.round(durationMs / 60000);

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Overlay - click outside to close */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="fixed inset-0 flex items-center justify-center p-4 pointer-events-none">
        <Dialog.Panel className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-lg flex flex-col pointer-events-auto">
          {/* Header */}
          <div className="flex items-center justify-between border-b px-6 py-4 sticky top-0 bg-white z-10">
            <Dialog.Title as="h2" className="text-xl font-semibold text-gray-900">
              {session.title}
            </Dialog.Title>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-red-500 text-xl leading-none transition-colors"
              aria-label="Đóng"
            >
              <FontAwesomeIcon icon={["fas", "xmark"]} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Session Info */}
            <div className="space-y-4">
              {/* Session Number */}
              {session.resource?.sessionNumber && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Buổi học số:</span> {session.resource.sessionNumber}
                </div>
              )}

              {/* Status */}
              {getStatusBadge(session.resource?.status)}

              {/* Time Range */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-gray-700 mb-3">Thông tin lịch học</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">Thời gian bắt đầu: </span>
                    <span className="font-medium text-gray-900">{formatTime(session.start)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Thời gian kết thúc: </span>
                    <span className="font-medium text-gray-900">{formatTime(session.end)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Ngày: </span>
                    <span className="font-medium text-gray-900">{format(session.start, "dd/MM/yyyy")}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Thời lượng: </span>
                    <span className="font-medium text-gray-900">{durationMinutes} phút</span>
                  </div>
                </div>
              </div>

              {/* Module & Class */}
              {(session.resource?.moduleName || session.resource?.className) && (
                <div className="bg-blue-50 rounded-lg p-4 space-y-2">
                  <h3 className="font-semibold text-gray-700 mb-2">Thông tin lớp học</h3>
                  <div className="space-y-1 text-sm">
                    {session.resource.moduleName && (
                      <div>
                        <span className="text-gray-600">Module: </span>
                        <span className="font-medium text-gray-900">{session.resource.moduleName}</span>
                      </div>
                    )}
                    {session.resource.className && (
                      <div>
                        <span className="text-gray-600">Lớp: </span>
                        <span className="font-medium text-gray-900">{session.resource.className}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Instructor */}
              {session.instructorName && (
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm">
                    <span className="text-gray-600">Giảng viên: </span>
                    <span className="font-medium text-gray-900">{session.instructorName}</span>
                  </div>
                </div>
              )}

              {/* Content */}
              {session.content && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-3">Nội dung buổi học</h3>
                  <div className="prose max-w-none">
                    <div className="text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg p-4 min-h-[100px]">
                      {session.content}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t px-6 py-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Đóng
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}

