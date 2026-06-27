import React from "react";
import type { Program } from "../../../types/program";
import type { Module } from "../../../types/module";
import type { Session } from "../../../types/session";
import { parseBackendDate } from "../../../utils/timeFormat";

interface ProgramModalProps {
  program: Program;
  onClose: () => void;
}

const ProgramModal: React.FC<ProgramModalProps> = ({ program, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[85vh] overflow-y-auto p-6 relative">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{program.name}</h2>
            {program.description && (
              <p className="text-gray-600 mt-1">{program.description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {program.modules && program.modules.length > 0 ? (
          <div className="space-y-5">
            {program.modules.map((mod: Module) => (
              <div
                key={mod.id}
                className="border border-gray-200 rounded-lg p-4 shadow-sm"
              >
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-800">
                      {mod.position}. {mod.name}
                    </h3>
                    {mod.description && (
                      <p className="text-sm text-gray-500">
                        {mod.description}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-indigo-600 font-medium">
                    {mod.sessions?.length ?? 0} buổi học
                  </span>
                </div>

                {mod.sessions && mod.sessions.length > 0 ? (
                  <div className="border-t border-gray-200 pt-3 space-y-2">
                    {mod.sessions.map((session: Session) => (
                      <div
                        key={session.id}
                        className="flex justify-between items-start bg-gray-50 p-3 rounded-md hover:bg-gray-100 transition"
                      >
                        <div>
                          <h4 className="text-sm font-medium text-gray-800">
                            {session.title}
                          </h4>
                          <p className="text-gray-500 text-xs mt-1">
                            {session.content}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-600">
                            {parseBackendDate(session.scheduledAt)?.toLocaleString("vi-VN") || '—'}
                          </p>
                          <span
                            className={`inline-block mt-1 text-[10px] font-semibold px-2 py-1 rounded-full ${
                              session.status === "planned"
                                ? "bg-yellow-100 text-yellow-800"
                                : session.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {session.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic mt-2">
                    Chưa có buổi học nào.
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic text-center py-4">
            Chưa có học phần nào trong chương trình này.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProgramModal;
