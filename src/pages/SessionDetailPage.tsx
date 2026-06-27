import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import SessionDetail from "../components/SessionDetail";
import { getSessionById } from "../services/moduleSessionApi";

interface SessionDetailDTO {
  id: number;
  title: string;
  content?: string;
  moduleId: number;
  sessionNumber?: number;
  scheduledAt?: string;
  endDate?: string;
  status?: string;
}

const SessionDetailPage: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionDetailDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    getSessionById(sessionId)
      .then(setSession)
      .catch(err => setError((err as Error).message || "Lỗi tải dữ liệu"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div>Đang tải chi tiết buổi học...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!session) return <div className="text-gray-500">Không tìm thấy buổi học này.</div>;
  return <SessionDetail session={session} />;
};

export default SessionDetailPage;
