import React, { useState } from "react";
import SessionList from "./SessionList";
import { useNavigate } from "react-router-dom";

type Session = { id: number; title: string; content?: string };
type Module = { id: number; name: string; sessions: Session[] };

interface ModuleListProps {
  modules: Module[];
  showSessionsInline?: boolean;  
  collapsible?: boolean;
}

const ModuleList: React.FC<ModuleListProps> = ({ modules, showSessionsInline, collapsible }) => {
  const [openModuleId, setOpenModuleId] = useState<number|null>(null);
  const navigate = useNavigate();

  const handleToggle = (id: number) => setOpenModuleId(openModuleId === id ? null : id);

  if (!showSessionsInline) {
    return (
      <div>
        <div className="space-y-4">
          {modules.map((mod) => (
            <div key={mod.id} className="border rounded shadow bg-white">
              <button
                className="w-full flex justify-between px-4 py-2 text-left hover:bg-blue-50"
                onClick={() => navigate(`/modules/${mod.id}`)}
              >
                <span className="font-semibold">{mod.name}</span>
                <span className="text-blue-600">Xem buổi học →</span>
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {modules.map((mod) => (
        <div key={mod.id} className="border rounded shadow bg-white">
          <div className="flex items-center justify-between px-4 py-2">
            <span className="font-semibold">{mod.name}</span>
            {collapsible ? (
              <button className="text-blue-600 text-sm" onClick={() => handleToggle(mod.id)}>
                {openModuleId === mod.id ? "Ẩn buổi học" : "Xem buổi học"}
              </button>
            ) : null}
          </div>
          {collapsible ? (
            openModuleId === mod.id ? <SessionList sessions={mod.sessions} /> : null
          ) : (
            <SessionList sessions={mod.sessions} />
          )}
        </div>
      ))}
    </div>
  );
};

export default ModuleList;
