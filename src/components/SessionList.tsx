import React from "react";
import { useNavigate } from "react-router-dom";

type Session = { id: number; title: string; content?: string };

const SessionList: React.FC<{ sessions: Session[] }> = ({ sessions }) => {
  const navigate = useNavigate();
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Tiêu đề</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Nội dung</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sessions.map((s) => (
            <tr key={s.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => navigate(`/session/${s.id}`)}>
              <td className="px-4 py-3 align-top text-sm font-medium text-blue-700">{s.title}</td>
              <td className="px-4 py-3 text-sm text-gray-700">
                <div className="max-w-prose truncate" title={s.content || '-'}>{s.content || '-'}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SessionList;
