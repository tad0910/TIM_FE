import type { CourseDisplay } from '../../../types/course';

interface UserCourseListProps {
  courses: CourseDisplay[];
  onCourseClick: (course: CourseDisplay) => void;
}

export default function UserCourseList({ courses, onCourseClick }: UserCourseListProps) {
  const getCourseIcon = (className: string) => {
    if (className.toLowerCase().includes('python')) {
      return (
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">Py</span>
        </div>
      );
    } else if (className.toLowerCase().includes('web') || className.toLowerCase().includes('frontend')) {
      return (
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">Web</span>
        </div>
      );
    } else if (className.toLowerCase().includes('git')) {
      return (
        <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">Git</span>
        </div>
      );
    } else if (className.toLowerCase().includes('sql') || className.toLowerCase().includes('database')) {
      return (
        <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">SQL</span>
        </div>
      );
    } else if (className.toLowerCase().includes('game')) {
      return (
        <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">🎮</span>
        </div>
      );
    } else if (className.toLowerCase().includes('data') || className.toLowerCase().includes('phân tích')) {
      return (
        <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">📊</span>
        </div>
      );
    }
    return (
      <div className="w-10 h-10 bg-gray-500 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-sm">📚</span>
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
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Khóa học
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tiến độ
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thành viên
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Ngày tham gia
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Thao tác
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
        {courses.map((course, index) => {
          const progress = course.progress || getProgressPercentage(course.courseName);
          const icon = getCourseIcon(course.courseName);
          const userJoinDate = course.enrollmentDate;
              
              return (
                <tr
                  key={index}
                  onClick={() => onCourseClick(course)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="mr-4">
                        {icon}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {course.courseName}
                        </div>
                        <div className="text-sm text-gray-500 line-clamp-1">
                          {course.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-2 mr-3">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {progress}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex -space-x-2 mr-3">
                        {/* Mock members display since CourseDisplay doesn't have members */}
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-medium text-indigo-600 border-2 border-white">
                          👤
                        </div>
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-medium text-indigo-600 border-2 border-white">
                          👤
                        </div>
                        <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-medium text-indigo-600 border-2 border-white">
                          👤
                        </div>
                      </div>
                      <span className="text-sm text-gray-500">
                        {course.studentCount || 0} người
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {userJoinDate ? formatJoinDate(userJoinDate) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex space-x-2">
                      <button className="text-indigo-600 hover:text-indigo-900">
                        Vào học
                      </button>
                      <button 
                        onClick={() => window.location.href = `/course-detail/${course.id}`}
                        className="text-gray-600 hover:text-gray-900"
                      >
                        Chi tiết
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
