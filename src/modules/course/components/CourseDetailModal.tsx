import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import type { CourseDisplay } from '../../../types/course';

interface CourseDetailModalProps {
  course: CourseDisplay;
  isOpen: boolean;
  onClose: () => void;
}

export default function CourseDetailModal({ course, isOpen, onClose }: CourseDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'members'>('overview');


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


  const progress = course.progress || getProgressPercentage(course.courseName);
  const icon = getCourseIcon(course.courseName);
  const teachers: unknown[] = [];
  const students: unknown[] = [];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-xl transition-all">
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-8 text-white">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-4">
                      {icon}
                      <div>
                        <Dialog.Title as="h3" className="text-2xl font-bold">
                          {course.courseName}
                        </Dialog.Title>
                        <p className="text-indigo-100 mt-1">
                          {course.studentCount || 0} thành viên • {progress}% hoàn thành
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
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
                      onClick={() => setActiveTab('members')}
                      className={`py-4 px-1 border-b-2 font-medium text-sm ${
                        activeTab === 'members'
                          ? 'border-indigo-500 text-indigo-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span className="mr-2">👥</span>
                      Thành viên ({course.studentCount || 0})
                    </button>
                  </nav>
                </div>

                <div className="px-6 py-6">
                  {activeTab === 'overview' ? (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 mb-3">Mô tả khóa học</h4>
                        <p className="text-gray-600 leading-relaxed">
                          {course.description}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-indigo-600">{progress}%</div>
                          <div className="text-sm text-gray-600">Tiến độ hoàn thành</div>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <div className="text-2xl font-bold text-green-600">{course.studentCount || 0}</div>
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
                  ) : (
                    <div className="space-y-6">
                      {(
                        <>
                          {teachers.length > 0 && (
                            <div>
                              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                                Giảng viên ({teachers.length})
                              </h4>
                              <div className="space-y-3">
                                {teachers.map((_, index) => (
                                  <div key={index} className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                      <span className="text-blue-600 font-medium">👨‍🏫</span>
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">
                                        Giảng viên {index + 1}
                                      </div>
                                      <div className="text-sm text-gray-500">
                                        Tham gia: N/A
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
                              {students.map((_, index) => (
                                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                    <span className="text-gray-600 font-medium">👤</span>
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">
                                      Học viên {index + 1}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      Tham gia: N/A
                                    </div>
                                  </div>
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                    Học viên
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {students.length === 0 && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                              <div className="text-gray-400 mb-2">👥</div>
                              <h5 className="font-medium text-gray-700 mb-1">Chưa có thành viên</h5>
                              <p className="text-sm text-gray-500">
                                Lớp học này chưa có thành viên nào.
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Đóng
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                    Vào học
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
