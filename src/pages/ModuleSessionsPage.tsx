import React, { useEffect, useState } from "react";
import SessionList from "../components/SessionList";
import { useParams } from "react-router-dom";
import { getSessionsByModule, type SessionDetailDTO } from "../services/moduleSessionApi";
import Pagination from "../components/Pagination";

type Session = { id: number; title: string; content?: string };

const ModuleSessionsPage: React.FC = () => {
  const { moduleId } = useParams<{ moduleId: string }>();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sortByTitleAsc, setSortByTitleAsc] = useState(true);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  useEffect(() => {
    if (!moduleId) return;
    setLoading(true);
    setError(null);
    getSessionsByModule(moduleId, currentPage, pageSize, `title,${sortByTitleAsc ? 'asc' : 'desc'}`)
      .then((page) => {
        setSessions((page.content || []).map((s: SessionDetailDTO) => ({ id: s.id, title: s.title, content: s.content || '' })));
        setTotalPages(page.totalPages || 0);
        setTotalElements(page.totalElements || 0);
        setCurrentPage(page.number || 0);
      })
      .catch(err => setError((err as Error).message || "Không thể tải danh sách buổi học"))
      .finally(() => setLoading(false));
  }, [moduleId, currentPage, pageSize, sortByTitleAsc]);

  if (!moduleId) return <div className="max-w-2xl mx-auto py-8">Thiếu tham số moduleId</div>;
  if (loading) return <div className="max-w-2xl mx-auto py-8">Đang tải danh sách buổi học...</div>;
  if (error) return <div className="max-w-2xl mx-auto py-8 text-red-600">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Các buổi học</h1>
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-gray-600">Sắp xếp theo tiêu đề</label>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          value={sortByTitleAsc ? 'asc' : 'desc'}
          onChange={(e) => { setSortByTitleAsc(e.target.value === 'asc'); setCurrentPage(0); }}
        >
          <option value="asc">A → Z</option>
          <option value="desc">Z → A</option>
        </select>
        <label className="ml-auto text-sm text-gray-600">Mỗi trang</label>
        <select
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          value={pageSize}
          onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(0); }}
        >
          <option value={10}>10</option>
          <option value={20}>20</option>
          <option value={50}>50</option>
        </select>
      </div>

      <SessionList sessions={sessions} />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={pageSize}
        onPageChange={(p) => setCurrentPage(p)}
        itemName="buổi học"
      />
    </div>
  );
};

export default ModuleSessionsPage;
