import React from "react";
import { useNavigate } from "react-router-dom";
import { parseBackendDate } from "../utils/timeFormat";

type Session = { 
  id: number; 
  title: string; 
  content?: string;
  sessionNumber?: number;
  scheduledAt?: string;
  endDate?: string;
  status?: string;
};

const SessionDetail: React.FC<{ session: Session }> = ({ session }) => {
  const navigate = useNavigate();

  const formatDateTime = (dateTimeStr?: string | number[] | null) => {
    if (!dateTimeStr) return "Chưa được lên lịch";
    try {
      const date = parseBackendDate(dateTimeStr);
      if (!date) return String(dateTimeStr);
      return date.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(dateTimeStr);
    }
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

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 rounded-lg shadow-lg">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 px-4 py-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg border border-blue-200 transition-colors"
      >
        ← Quay lại
      </button>

      <div className="space-y-6">
        {/* Header Section */}
        <div className="border-b pb-4">
          {session.sessionNumber && (
            <div className="text-sm text-gray-500 mb-2">
              Buổi học số: <span className="font-semibold text-gray-700">{session.sessionNumber}</span>
            </div>
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{session.title}</h1>
          <div className="flex items-center gap-4 flex-wrap">
            {getStatusBadge(session.status)}
          </div>
        </div>

        {/* Schedule Information */}
        {(session.scheduledAt || session.endDate) && (
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-gray-700 mb-3">Thông tin lịch học</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {session.scheduledAt && (
                <div>
                  <span className="text-gray-600">Thời gian bắt đầu: </span>
                  <span className="font-medium text-gray-900">{formatDateTime(session.scheduledAt)}</span>
                </div>
              )}
              {session.endDate && (
                <div>
                  <span className="text-gray-600">Thời gian kết thúc: </span>
                  <span className="font-medium text-gray-900">{formatDateTime(session.endDate)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Content Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-3">Nội dung buổi học</h2>
          <div className="prose max-w-none">
            <div className="text-gray-700 whitespace-pre-line bg-gray-50 rounded-lg p-4 min-h-[200px]">
              {session.content || "Chưa có nội dung cho buổi học này."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionDetail;
