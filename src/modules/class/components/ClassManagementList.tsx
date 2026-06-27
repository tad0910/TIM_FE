import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllClassesAsArray, deleteClass, enrollToClass } from '../../../services/classApi';
import type { ClassInfo } from '../../../types/class';
import ClassFormModal from './ClassFormModal';
import ClassMembersModal from './ClassMembersModal';
import { Toast } from '../../../components/Toast';
import { useIsAdminSimple } from '../../../utils/useIsAdmin';
import { useAuthStore } from '../../../store/useAuthStore';

type TabType = 'classes' | 'modules' | 'grades' | 'members';

const ClassManagementList: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('classes');
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassInfo | null>(null);
  const [deleteDialogClass, setDeleteDialogClass] = useState<ClassInfo | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const isAdmin = useIsAdminSimple();
  const { user } = useAuthStore();

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllClassesAsArray();
      setClasses(data);
    } catch (err) {
      console.error('Error loading classes:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
        setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      } else {
        setError('Không thể tải danh sách lớp học');
      }
      setToast({ message: errorMessage, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedClass(null);
    setIsCreateModalOpen(true);
  };

  const handleEdit = (classInfo: ClassInfo) => {
    setSelectedClass(classInfo);
    setIsEditModalOpen(true);
  };

  const handleManageMembers = (classInfo: ClassInfo) => {
    setSelectedClass(classInfo);
    setIsMembersModalOpen(true);
  };

  const handleDelete = (classInfo: ClassInfo) => {
    setDeleteDialogClass(classInfo);
  };

  const confirmDelete = async () => {
    if (!deleteDialogClass) return;

    try {
      await deleteClass(deleteDialogClass.id);
      setToast({ message: 'Xóa lớp học thành công', type: 'success' });
      await loadClasses();
      setDeleteDialogClass(null);
    } catch (err) {
      console.error('Error deleting class:', err);
      const errorMessage = err instanceof Error ? err.message : 'Không thể xóa lớp học';
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  const filteredClasses = classes.filter(classItem =>
    classItem.className.toLowerCase().includes(searchKeyword.toLowerCase()) ||
    (classItem.description && classItem.description.toLowerCase().includes(searchKeyword.toLowerCase()))
  );

  const getTeacherCount = (members: ClassInfo['members']) => {
    return members.filter(m => m.role === 'giao_vien').length;
  };

  const getStudentCount = (members: ClassInfo['members']) => {
    return members.filter(m => m.role === 'sinh_vien').length;
  };

  const isUserMemberOfClass = (classItem: ClassInfo): boolean => {
    if (!user?.id) return false;
    const userId = parseInt(user.id);
    return classItem.members.some(m => m.userId === userId);
  };


  const handleEnroll = async (classId: number) => {
    try {
      await enrollToClass(classId);
      setToast({ message: 'Đăng ký vào lớp học thành công', type: 'success' });
      await loadClasses();
    } catch (err) {
      console.error('Error enrolling to class:', err);
      const errorMessage = err instanceof Error ? err.message : 'Không thể đăng ký vào lớp học';
      setToast({ message: errorMessage, type: 'error' });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Quản lý lớp học</h1>
        
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('classes')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'classes'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Danh sách lớp học
            </button>
            <button
              onClick={() => setActiveTab('modules')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'modules'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Modules
            </button>
            <button
              onClick={() => setActiveTab('grades')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'grades'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Điểm số
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'members'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Danh sách học viên
            </button>
          </nav>
        </div>
      </div>

      {activeTab === 'classes' && (
        <>
          <div className="flex justify-between items-center mb-4">
            <div></div>
            {isAdmin && (
              <button
                onClick={handleCreate}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tạo lớp học mới
              </button>
            )}
          </div>

          {/* Search bar */}
          <div className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Tìm kiếm lớp học..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {filteredClasses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-lg">Không có lớp học nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((classItem) => (
                <div key={classItem.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {classItem.className}
                    </h3>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(classItem)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Chỉnh sửa"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(classItem)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Xóa"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>

                  {classItem.description && (
                    <p className="text-gray-600 mb-4 line-clamp-2">
                      {classItem.description}
                    </p>
                  )}

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Giáo viên:</span>
                      <span className="font-medium text-gray-900">{getTeacherCount(classItem.members)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Sinh viên:</span>
                      <span className="font-medium text-gray-900">{getStudentCount(classItem.members)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-500">Tổng thành viên:</span>
                      <span className="font-medium text-gray-900">{classItem.members.length}</span>
                    </div>
                    {classItem.program && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-500">Chương trình:</span>
                        <span className="font-medium text-blue-600">{classItem.program.name}</span>
                      </div>
                    )}
                  </div>

                  {isUserMemberOfClass(classItem) ? (
                    <button
                      onClick={() => handleManageMembers(classItem)}
                      className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                    >
                      {isAdmin ? 'Quản lý thành viên' : 'Xem thành viên'}
                    </button>
                  ) : (
                    !isAdmin && (
                      <button
                        onClick={() => handleEnroll(classItem.id)}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Đăng ký vào lớp học
                      </button>
                    )
                  )}
                  {isAdmin && !isUserMemberOfClass(classItem) && (
                    <button
                      onClick={() => handleManageMembers(classItem)}
                      className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors mt-2"
                    >
                      Quản lý thành viên
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'modules' && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">Chức năng Modules đang được phát triển</p>
        </div>
      )}

      {activeTab === 'grades' && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">Chức năng Điểm số đang được phát triển</p>
        </div>
      )}

      {activeTab === 'members' && (
        <div className="text-center py-8">
          <p className="text-gray-500 text-lg">Chức năng Danh sách học viên đang được phát triển</p>
        </div>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <ClassFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false);
            loadClasses();
            setToast({ message: 'Tạo lớp học thành công', type: 'success' });
          }}
        />
      )}

      {/* Edit Modal */}
      {isEditModalOpen && selectedClass && (
        <ClassFormModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedClass(null);
          }}
          onSuccess={() => {
            setIsEditModalOpen(false);
            setSelectedClass(null);
            loadClasses();
            setToast({ message: 'Cập nhật lớp học thành công', type: 'success' });
          }}
          classInfo={selectedClass}
        />
      )}

      {/* Members Modal */}
      {isMembersModalOpen && selectedClass && (
        <ClassMembersModal
          isOpen={isMembersModalOpen}
          onClose={() => {
            setIsMembersModalOpen(false);
            setSelectedClass(null);
          }}
          classInfo={selectedClass}
          onSuccess={() => {
            loadClasses();
            setToast({ message: 'Cập nhật thành viên thành công', type: 'success' });
          }}
        />
      )}

      {/* Delete Dialog */}
      {deleteDialogClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Xóa lớp học</h2>
                <p className="text-sm text-gray-500">Hành động này không thể hoàn tác</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                Bạn có chắc chắn muốn xóa lớp học <strong>{deleteDialogClass.className}</strong> không? Tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteDialogClass(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Xóa lớp học
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagementList;

