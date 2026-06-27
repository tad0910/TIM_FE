import type { CourseDisplay } from '../../../types/course';

interface UserCourseCardProps {
  courses: CourseDisplay[];
  onCourseClick: (course: CourseDisplay) => void;
}

export default function UserCourseCard({ courses, onCourseClick }: UserCourseCardProps) {
  const getCourseIcon = (className: string) => {
    if (className.toLowerCase().includes('python')) {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-blue-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">Py</span>
        </div>
      );
    } else if (className.toLowerCase().includes('web') || className.toLowerCase().includes('frontend')) {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">Web</span>
        </div>
      );
    } else if (className.toLowerCase().includes('git')) {
      return (
        <div className="w-12 h-12 bg-orange-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">Git</span>
        </div>
      );
    } else if (className.toLowerCase().includes('sql') || className.toLowerCase().includes('database')) {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">SQL</span>
        </div>
      );
    } else if (className.toLowerCase().includes('game')) {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">🎮</span>
        </div>
      );
    } else if (className.toLowerCase().includes('data') || className.toLowerCase().includes('phân tích')) {
      return (
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-lg">📊</span>
        </div>
      );
    }
    return (
      <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center">
        <span className="text-white font-bold text-lg">📚</span>
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

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map((course, index) => {
          const progress = course.progress || getProgressPercentage(course.courseName);
          const icon = getCourseIcon(course.courseName);
          
          return (
            <div
              key={index}
              onClick={() => onCourseClick(course)}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-200 cursor-pointer group"
            >
              {/* Course Header */}
              <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {icon}
                  <div>
                    <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {course.courseName}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {course.studentCount || 0} thành viên
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium text-indigo-600">
                    {progress}%
                  </span>
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                {course.description}
              </p>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-medium text-gray-500">Tiến độ</span>
                  <span className="text-xs text-gray-500">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Members Preview */}
              <div className="flex items-center justify-between">
                <div className="flex -space-x-2">
                  {/* Mock members display since CourseDisplay doesn't have members */}
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-medium text-indigo-600 border-2 border-white">
                    👤
                  </div>
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-medium text-indigo-600 border-2 border-white">
                    👤
                  </div>
                  <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-medium text-indigo-600 border-2 border-white">
                    👤
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button className="text-indigo-600 hover:text-indigo-700 text-sm font-medium">
                    Vào học →
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = `/course-detail/${course.id}`;
                    }}
                    className="text-gray-600 hover:text-gray-700 text-sm font-medium"
                  >
                    Chi tiết
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
