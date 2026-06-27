import ScheduleCalendar from '../../../components/ScheduleCalendar';
import type { EventCalendar } from '../../../components/ScheduleCalendar';
import { useEffect, useState } from 'react';
import CalendarMini from '../../../components/CalendarMini';
import { getAllClassesAsArray } from '../../../services/classApi';
import { getSchedulesByClass, getAllSchedulesByTeacher } from '../../../services/scheduleApi';
import type { ClassModuleScheduleDTO } from '../../../services/scheduleApi';
import { getSessionsByModule } from '../../../services/moduleSessionApi';
import type { SessionDetailDTO } from '../../../services/moduleSessionApi';
import { parseISO, addHours } from 'date-fns';
import SessionDetailModal from '../../../components/SessionDetailModal';

export default function SchedulePage() {
  const userId = Number(localStorage.getItem('userId'));
  const rolesStr = (localStorage.getItem('roles') || localStorage.getItem('role') || '').toLowerCase();
  const isTeacher = rolesStr.includes('teacher') || rolesStr.includes('giao_vien') || rolesStr.includes('lecturer');
  const [selectedEvent, setSelectedEvent] = useState<EventCalendar | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<EventCalendar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAllClassesAsArray()
      .then(all => {
        const classes = Array.isArray(all) ? all : [];
        console.log('All classes:', classes);
        let joined = classes.filter(cls => Array.isArray(cls.members) && cls.members.some(m => {
          const mid = Number((m as any).userId ?? (m as any).user?.id);
          return Number.isFinite(mid) && mid === userId;
        }));
        if (!isTeacher && joined.length === 0) {
          joined = classes;
        }
        console.log('Joined classes:', joined);
        
        if (joined.length > 0) {
          Promise.all(joined.map(cls => getSchedulesByClass(cls.id)))
            .then(allSchedules => {
              console.log('All schedules:', allSchedules);
              const flattened = allSchedules.flat();
              console.log('Flattened schedules:', flattened);
              
              const moduleIds = [...new Set(flattened.map(s => s.moduleId))];
              console.log('Module IDs from schedules:', moduleIds);
              
              Promise.all(moduleIds.map(moduleId => getSessionsByModule(moduleId)))
                .then(allSessions => {
                  console.log('All sessions:', allSessions);
                  const sessionsByModule = new Map<number, SessionDetailDTO[]>();
                  allSessions.forEach((resp, index) => {
                    const sessions = Array.isArray(resp) ? resp : (resp && typeof resp === 'object' && 'content' in resp ? (resp as any).content : []);
                    sessionsByModule.set(moduleIds[index], sessions as SessionDetailDTO[]);
                  });
                  console.log('Sessions by module:', sessionsByModule);
                  
                  const mappedEvents: EventCalendar[] = [];
                  const daySlotCounter = new Map<string, number>();

                  flattened.forEach((schedule: ClassModuleScheduleDTO) => {
                    const sess = sessionsByModule.get(schedule.moduleId);
                    const matchedSession = (schedule.moduleSessionId && sess)
                      ? sess.find(s => String(s.id) === String(schedule.moduleSessionId))
                      : undefined;

                    let start: Date | null = null;
                    let end: Date | null = null;
                    try {
                      if (schedule.startDate) start = parseISO(schedule.startDate);
                      if (schedule.endDate) end = parseISO(schedule.endDate);
                    } catch {}

                    if (!start || !end) {
                      const day = schedule.startDate ? parseISO(schedule.startDate) : new Date();
                      const key = `${day.getFullYear()}-${day.getMonth()+1}-${day.getDate()}`;
                      const next = (daySlotCounter.get(key) ?? 0);
                      daySlotCounter.set(key, next + 1);
                      const startMinutes = 8 * 60 + next * 105;
                      const startHour = Math.floor(startMinutes / 60);
                      const startMin = startMinutes % 60;
                      start = new Date(day); start.setHours(startHour, startMin, 0, 0);
                      end = new Date(start.getTime() + 90 * 60 * 1000);
                    }

                    const title = matchedSession?.title
                      || (matchedSession?.sessionNumber ? `Buổi học số ${matchedSession.sessionNumber}` : undefined)
                      || schedule.moduleName
                      || `Module ${schedule.moduleId}`;

                    mappedEvents.push({
                      id: schedule.id,
                      title,
                      start: start!,
                      end: end!,
                      content: matchedSession?.content,
                      resource: {
                        moduleName: schedule.moduleName,
                        className: schedule.className,
                        instructorName: schedule.instructorName,
                        status: (matchedSession?.status as any) ?? schedule.status,
                        moduleId: schedule.moduleId,
                        classId: schedule.classId,
                        content: matchedSession?.content,
                        sessionNumber: matchedSession?.sessionNumber,
                      },
                      instructorName: schedule.instructorName,
                    });
                  });

                  mappedEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
                  console.log('Final mapped events:', mappedEvents);
                  setEvents(mappedEvents);
                  setLoading(false);
                })
                .catch((err) => {
                  console.error('Error fetching sessions:', err);
                  setEvents([]);
                  setLoading(false);
                });
            })
            .catch((err) => {
              console.error('Error fetching schedules:', err);
              setEvents([]);
              setLoading(false);
            });
        } else if (isTeacher) {
          console.log('No joined classes for user, fallback to teacher schedules');
          getAllSchedulesByTeacher(userId)
            .then((teacherSchedules) => {
              const list = Array.isArray(teacherSchedules) ? teacherSchedules : [];
              const mappedEvents: EventCalendar[] = list.map((schedule: ClassModuleScheduleDTO) => {
                let startDate = parseISO(schedule.startDate);
                let endDate = parseISO(schedule.endDate);
                if (startDate.getHours() === 0 && startDate.getMinutes() === 0) startDate = addHours(startDate, 8);
                if (endDate.getHours() === 0 && endDate.getMinutes() === 0) {
                  if (startDate.toDateString() === endDate.toDateString()) endDate = addHours(startDate, 9);
                  else endDate = addHours(endDate, 17);
                }
                return {
                  id: schedule.id,
                  title: schedule.moduleName || `Module ${schedule.moduleId}`,
                  start: startDate,
                  end: endDate,
                  content: undefined,
                  resource: {
                    moduleName: schedule.moduleName,
                    className: schedule.className,
                    instructorName: schedule.instructorName,
                    status: schedule.status,
                    moduleId: schedule.moduleId,
                    classId: schedule.classId,
                  },
                  instructorName: schedule.instructorName,
                } as EventCalendar;
              });
              setEvents(mappedEvents);
              setLoading(false);
            })
            .catch((err) => {
              console.error('Error fetching teacher schedules:', err);
              setEvents([]);
              setLoading(false);
            });
        } else {
          console.log('No joined classes for user and not a teacher. No schedules to show.');
          setEvents([]);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching classes:', err);
        setEvents([]);
        setLoading(false);
      });
  }, [userId]);

  const todayEvents = events.filter(event => {
    const eventDate = new Date(event.start);
    return eventDate.toDateString() === selectedDate.toDateString();
  });

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: '#F2F4F7' }}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Lịch học cá nhân</h1>
          <p className="text-gray-600">Xem lịch học và lịch thi của bạn</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-lg p-6 relative">
              {loading && (
                <div className="absolute inset-0 bg-white bg-opacity-90 z-10 flex items-center justify-center rounded-2xl">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Đang tải lịch học...</p>
                  </div>
                </div>
              )}
              <ScheduleCalendar
                events={events}
                loading={loading}
                onSelectEvent={setSelectedEvent}
                selectedDate={selectedDate}
                onChangeDate={setSelectedDate}
              />
            </div>
          </div>

          <aside className="w-full lg:w-80 flex flex-col gap-6">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
              <CalendarMini value={selectedDate} onChange={setSelectedDate}/>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Lịch hôm nay</h3>
              </div>
              
              <p className="text-sm text-gray-500 mb-4">
                {selectedDate.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>

              {selectedEvent ? (
                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <h4 className="font-bold text-gray-900 text-base leading-tight">{selectedEvent.title}</h4>
                    <button
                      onClick={() => setSelectedEvent(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  
                  {selectedEvent.resource?.moduleName && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span className="font-medium">{selectedEvent.resource.moduleName}</span>
                    </div>
                  )}
                  
                  {selectedEvent.resource?.className && (
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      <span>{selectedEvent.resource.className}</span>
                    </div>
                  )}
                  
                  {selectedEvent.start && selectedEvent.end && (
                    <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700 bg-white rounded-lg px-3 py-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {selectedEvent.start.toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'})} - {selectedEvent.end.toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'})}
                      </span>
                    </div>
                  )}
                  
                  {selectedEvent.instructorName && (
                    <div className="flex items-center gap-2 text-sm text-gray-700 pt-2 border-t border-indigo-200">
                      <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="font-medium">Giảng viên: {selectedEvent.instructorName}</span>
                    </div>
                  )}
                </div>
              ) : todayEvents.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600 mb-2">Có {todayEvents.length} buổi học hôm nay:</p>
                  {todayEvents.slice(0, 3).map((event) => (
                    <button
                      key={event.id}
                      onClick={() => setSelectedEvent(event)}
                      className="w-full text-left bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-300 rounded-lg p-3 transition-all"
                    >
                      <div className="font-medium text-gray-900 text-sm mb-1">{event.title}</div>
                      <div className="text-xs text-gray-500">
                        {event.start.toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'})} - {event.end.toLocaleTimeString('vi-VN', {hour:'2-digit',minute:'2-digit'})}
                      </div>
                    </button>
                  ))}
                  {todayEvents.length > 3 && (
                    <p className="text-xs text-gray-500 text-center">và {todayEvents.length - 3} buổi học khác</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500">Không có buổi học nào</p>
                  <p className="text-xs text-gray-400 mt-1">Bấm vào buổi học trên lịch để xem chi tiết</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>

      <SessionDetailModal
        isOpen={!!selectedEvent}
        onClose={() => setSelectedEvent(null)}
        session={selectedEvent}
      />
    </div>
  );
}
