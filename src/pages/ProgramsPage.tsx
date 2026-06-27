import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { programApi } from "../services/programApi";

interface ProgramItem {
  id: number;
  name: string;
  description?: string;
}

const ProgramsPage: React.FC = () => {
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    setError(null);
    programApi
      .getAllPrograms({ size: 1000 })
      .then(setPrograms)
      .catch(err => setError((err as Error).message || "Không thể tải danh sách chương trình"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-2xl mx-auto py-8">Đang tải chương trình...</div>;
  if (error) return <div className="max-w-2xl mx-auto py-8 text-red-600">{error}</div>;

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Chương trình học</h1>
      <div className="space-y-4">
        {programs.map(p => (
          <div key={p.id} className="border rounded bg-white shadow">
            <button
              className="w-full text-left px-4 py-3 hover:bg-blue-50"
              onClick={() => navigate(`/programs/${p.id}`)}
            >
              <div className="font-semibold">{p.name}</div>
              {p.description && (
                <div className="text-gray-600 text-sm line-clamp-2">{p.description}</div>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgramsPage;
