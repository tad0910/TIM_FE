import { useState, useEffect, useRef } from "react";
import { getAllUsers } from "../../services/userApi";
import type { User } from "../../services/userApi";

interface StudentSearchProps {
  onSelect: (student: User | null) => void;
  selectedStudent: User | null;
  onError?: (message?: string) => void;
}

export default function StudentSearch({
  onSelect,
  selectedStudent,
  onError,
}: StudentSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [students, setStudents] = useState<User[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<User[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        setLoading(true);
        const response = await getAllUsers(0, 1000);
        const normalized = response.content ?? [];
        const roleFiltered = normalized.filter((user) =>
          user.roles?.some((r) =>
            r.name?.toLowerCase().includes("sinh_vien") ||
            r.name?.toLowerCase().includes("student")
          ) ||
          user.role?.toLowerCase().includes("sinh_vien") ||
          user.role?.toLowerCase().includes("student")
        );
        setStudents(roleFiltered.length > 0 ? roleFiltered : normalized);
        onError?.();
      } catch (error) {
        console.error("Failed to load students", error);
        onError?.("Không thể tải danh sách học viên");
      } finally {
        setLoading(false);
      }
    };
    loadStudents();
  }, [onError]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredStudents(students.slice(0, 10));
    } else {
      const filtered = students.filter(
        (student) =>
          student.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          `${student.lastName || ""} ${student.firstName || ""}`
            .trim()
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          student.id.toString().includes(searchTerm)
      );
      setFilteredStudents(filtered.slice(0, 10));
    }
  }, [searchTerm, students]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (student: User) => {
    onSelect(student);
    setSearchTerm(
      `${student.lastName || ""} ${student.firstName || ""}`.trim() ||
        student.username
    );
    setShowDropdown(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setShowDropdown(true);
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  const getStudentDisplayName = (student: User) => {
    const fullName = `${student.lastName || ""} ${student.firstName || ""}`.trim();
    return fullName || student.username;
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-semibold text-gray-700">
        Chọn học viên
      </label>
      <div className="relative" ref={dropdownRef}>
        <input
          type="text"
          value={
            selectedStudent
              ? getStudentDisplayName(selectedStudent)
              : searchTerm
          }
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder="Tìm kiếm học viên..."
          className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
          disabled={!!selectedStudent}
        />
        {selectedStudent && (
          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setSearchTerm("");
            }}
            className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
        {showDropdown && !selectedStudent && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                Đang tải...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="px-4 py-2 text-sm text-gray-500">
                Không tìm thấy học viên
              </div>
            ) : (
              filteredStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => handleSelect(student)}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium">
                    {getStudentDisplayName(student)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {student.email} • Mã HV: {student.id}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      {selectedStudent && (
        <div className="text-xs text-gray-600 mt-1">
          Đã chọn: {getStudentDisplayName(selectedStudent)} (Mã HV:{" "}
          {selectedStudent.id})
        </div>
      )}
    </div>
  );
}

