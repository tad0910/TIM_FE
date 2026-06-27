import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getClassInfo } from '../../../services/classApi';
import { getCourseById, getUserClassInfo } from '../../../services/courseApi';
import type { ClassInfo } from '../../../types/class';

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [courseInfo, setCourseInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'materials' | 'members'>('overview');

  useEffect(() => {
    if (courseId) {
      loadCourseDetails();
    }
  }, [courseId]);

  const loadCourseDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      try {
        const userClassInfo = await getUserClassInfo(parseInt(courseId!));
        if (userClassInfo) {
          setCourseInfo(userClassInfo);
          return;
        }
      } catch (userClassError) {
        console.log('User class info not available:', userClassError);
      }
      
      try {
        const courseData = await getCourseById(parseInt(courseId!));
        const courseInfo: ClassInfo = {
          id: courseData.id,
          className: courseData.courseName,
          description: courseData.description,
          members: []
        };
        setCourseInfo(courseInfo);
      } catch (courseError) {
        console.log('Course API failed, trying class API:', courseError);
        const courseDetails = await getClassInfo(parseInt(courseId!));
        setCourseInfo(courseDetails);
      }
    } catch (err) {
      console.error('Error loading course details:', err);
      setError('Không thể tải thông tin chi tiết khóa học');
    } finally {
      setLoading(false);
    }
  };

  const getCourseIcon = (className: string) => {
    if (className.toLowerCase().includes('python')) {
      return (
        <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-blue-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-2xl">Py</span>
        </div>
      );
    } else if (className.toLowerCase().includes('web') || className.toLowerCase().includes('frontend')) {
      return (
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-2xl">Web</span>
        </div>
      );
    } else if (className.toLowerCase().includes('git')) {
      return (
        <div className="w-16 h-16 bg-orange-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-2xl">Git</span>
        </div>
      );
    } else if (className.toLowerCase().includes('sql') || className.toLowerCase().includes('database')) {
      return (
        <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-2xl">SQL</span>
        </div>
      );
    } else if (className.toLowerCase().includes('game')) {
      return (
        <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-2xl">🎮</span>
        </div>
      );
    } else if (className.toLowerCase().includes('data') || className.toLowerCase().includes('phân tích')) {
      return (
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-2xl">📊</span>
        </div>
      );
    }
    return (
      <div className="w-16 h-16 bg-gray-500 rounded-xl flex items-center justify-center">
        <span className="text-white font-bold text-2xl">📚</span>
      </div>
    );
  };

  const getProgressPercentage = (className: string) => {
    const progressMap: { [key: string]: number } = {
      'Python Căn Bản': 74,
      'Web Front-end Development': 50,
      'Quản lý mã nguồn với Git': 27,
      'SQL trong phân tích dữ liệu': 32,
      'Game Development': 36,
      'Nhập môn phân tích dữ liệu': 67
    };
    return progressMap[className] || Math.floor(Math.random() * 100);
  };

  const formatJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải thông tin khóa học...</p>
        </div>
      </div>
    );
  }

  if (error || !courseInfo) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Không thể tải khóa học</h2>
          <p className="text-gray-600 mb-4">{error || 'Khóa học không tồn tại'}</p>
          <button
            onClick={() => navigate('/my-courses')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const progress = getProgressPercentage(courseInfo.className);
  const icon = getCourseIcon(courseInfo.className);
  const teachers = courseInfo.members.filter(m => m.role === 'giang_vien');
  const students = courseInfo.members.filter(m => m.role === 'hoc_vien');

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white mb-8">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-6">
              {icon}
              <div>
                <h1 className="text-3xl font-bold mb-2">{courseInfo.className}</h1>
                <p className="text-indigo-100 text-lg">{courseInfo.description}</p>
                <div className="flex items-center space-x-6 mt-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-indigo-100">👥</span>
                    <span>{courseInfo.members.length} thành viên</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-indigo-100">📊</span>
                    <span>{progress}% hoàn thành</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => navigate('/my-courses')}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <span className="text-2xl">✕</span>
            </button>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium text-indigo-100">Tiến độ học tập</span>
              <span className="text-sm font-bold">{progress}%</span>
            </div>
            <div className="w-full bg-white bg-opacity-20 rounded-full h-3">
              <div
                className="bg-white h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">📚</span>
                Tổng quan
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'schedule'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">📅</span>
                Lịch học
              </button>
              <button
                onClick={() => setActiveTab('materials')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'materials'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">📁</span>
                Tài liệu
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'members'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">👥</span>
                Thành viên ({courseInfo.members.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Mô tả khóa học</h3>
                  <p className="text-gray-600 leading-relaxed">{courseInfo.description}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-indigo-600">{progress}%</div>
                    <div className="text-sm text-gray-600">Tiến độ hoàn thành</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{students.length}</div>
                    <div className="text-sm text-gray-600">Học viên</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-blue-600">{teachers.length}</div>
                    <div className="text-sm text-gray-600">Giảng viên</div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="text-yellow-600 mr-3">⚠️</div>
                    <div>
                      <h5 className="font-medium text-yellow-800">Lưu ý</h5>
                      <p className="text-sm text-yellow-700 mt-1">
                        Thông tin chi tiết về lịch học, tài liệu và bài tập sẽ được cập nhật trong thời gian tới.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Lịch học</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <div className="text-gray-400 mb-2">📅</div>
                  <h5 className="font-medium text-gray-700 mb-1">Lịch học chi tiết</h5>
                  <p className="text-sm text-gray-500">
                    Lịch học chi tiết sẽ được cập nhật trong thời gian tới.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'materials' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Tài liệu học tập</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                  <div className="text-gray-400 mb-2">📁</div>
                  <h5 className="font-medium text-gray-700 mb-1">Tài liệu khóa học</h5>
                  <p className="text-sm text-gray-500">
                    Tài liệu học tập sẽ được cập nhật trong thời gian tới.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'members' && (
              <div className="space-y-6">
                {teachers.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">
                      Giảng viên ({teachers.length})
                    </h4>
                    <div className="space-y-3">
                      {teachers.map((teacher, index) => (
                        <div key={teacher.id || index} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-medium">👨‍🏫</span>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">
                              {teacher.user?.firstName && teacher.user?.lastName 
                                ? `${teacher.user.firstName} ${teacher.user.lastName}`
                                : `Giảng viên ${index + 1}`
                              }
                            </div>
                            <div className="text-sm text-gray-500">
                              Tham gia: {formatJoinDate(teacher.joinDate)}
                            </div>
                          </div>
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                            Giảng viên
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    Học viên ({students.length})
                  </h4>
                  <div className="space-y-3">
                    {students.map((student, index) => (
                      <div key={student.id || index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-gray-600 font-medium">👤</span>
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {student.user?.firstName && student.user?.lastName 
                              ? `${student.user.firstName} ${student.user.lastName}`
                              : `Học viên ${index + 1}`
                            }
                          </div>
                          <div className="text-sm text-gray-500">
                            Tham gia: {formatJoinDate(student.joinDate)}
                          </div>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                          Học viên
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {courseInfo.members.length === 0 && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                    <div className="text-gray-400 mb-2">👥</div>
                    <h5 className="font-medium text-gray-700 mb-1">Chưa có thành viên</h5>
                    <p className="text-sm text-gray-500">
                      Lớp học này chưa có thành viên nào.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
