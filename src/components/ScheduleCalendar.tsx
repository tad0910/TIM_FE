import { Calendar, dateFnsLocalizer, Views, Navigate } from 'react-big-calendar';
import { useRef } from 'react';
import { format, parseISO, isToday, startOfWeek, endOfWeek } from 'date-fns';
import { vi } from 'date-fns/locale';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'vi': vi,
};
const localizer = dateFnsLocalizer({
  format,
  parse: parseISO,
  startOfWeek: () => new Date(new Date().setDate(new Date().getDate() - new Date().getDay() + 1)), 
  getDay: (d: Date) => d.getDay(),
  locales,
});

export interface SessionDetailDTO {
  id: number;
  title: string;
  content?: string;
  moduleId: number;
  sessionNumber?: number;
  scheduledAt?: string;
  endDate?: string;
  status?: string;
  instructorName?: string;
}

export interface EventCalendar {
  id: number;
  title: string;
  start: Date;
  end: Date;
  resource: {
    moduleName?: string;
    className?: string;
    instructorName?: string;
    status?: string;
    content?: string;
    [key: string]: unknown;
  };
  content?: string;
  instructorName?: string;
}

type Props = {
  events?: EventCalendar[];
  loading?: boolean;
  onSelectEvent?: (event: EventCalendar) => void;
  selectedDate?: Date;
  onChangeDate?: (date: Date) => void;
};

export default function ScheduleCalendar({ events = [], loading = false, onSelectEvent, selectedDate, onChangeDate }: Props) {
  const calendarRef = useRef<unknown>(null);

  function EventCustom({ event }: { event: EventCalendar }) {
    const resource = event.resource;
    
      return (
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderLeft: '4px solid #4f46e5',
        borderRadius: 8,
        padding: '6px 8px',
        fontSize: 13,
        color: '#ffffff',
        fontWeight: 500,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}>
        <div style={{fontWeight:'bold', marginBottom:2}}>{event.title}</div>
        {resource?.className && (
          <div style={{fontSize:11, opacity:0.9, marginTop:2}}>{resource.className}</div>
        )}
      </div>
    );
  }

 function WeekHeader({ date }: { date: Date }) {
    const isTodayDate = isToday(date);
    const dayName = format(date, 'EEE', { locale: vi });
    const dayNumber = format(date, 'd');
    const monthNumber = format(date, 'M');
    const year = format(date, 'yyyy');
    const fullDate = `${dayNumber}/${monthNumber}/${year}`;
    
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 8px',
        background: isTodayDate 
          ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' 
          : 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderBottom: isTodayDate ? '3px solid #f59e0b' : '2px solid #e2e8f0',
        borderRadius: isTodayDate ? '8px 8px 0 0' : '0',
        height: '100%',
        minHeight: '80px',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: isTodayDate ? '#92400e' : '#1e293b',
          marginBottom: 8,
          textAlign: 'center',
        }}>
          {fullDate}
        </div>
        <div style={{
          fontSize: 12,
          fontWeight: 600,
          color: isTodayDate ? '#92400e' : '#475569',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          textAlign: 'center',
        }}>
          {dayName}
        </div>
      </div>
    );
  }

   function MonthHeader({ date }: { date: Date }) {
    const dayName = format(date, 'EEE', { locale: vi });
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
        minHeight: '48px',
        padding: '0 8px',
        fontSize: 12,
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        color: '#475569',
      }}>
        {dayName}
      </div>
    );
  }

    function CustomToolbar({ date, view, onNavigate, onView }: {
    date: Date;
    view: string;
    onNavigate: (action: Navigate) => void;
    onView: (view: string) => void;
  }) {
    const navigate = (action: Navigate) => {
      onNavigate(action);
    };

    const goToToday = () => {
      onNavigate(Navigate.TODAY);
    };

    const changeView = (newView: string) => {
      onView(newView);
    };

      const getDateLabel = () => {
      if (view === 'month') {
        const month = format(date, 'M', { locale: vi });
        const year = format(date, 'yyyy', { locale: vi });
        return `Tháng ${month}/${year}`;
      } else if (view === 'week') {
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
        const startDay = format(weekStart, 'd', { locale: vi });
        const endDay = format(weekEnd, 'd', { locale: vi });
        const month = format(date, 'M', { locale: vi });
        const year = format(date, 'yyyy', { locale: vi });
        return `Tuần ${startDay}-${endDay}/ Tháng ${month}/${year}`;
      } else {
        const dayName = format(date, 'EEEE', { locale: vi });
        const day = format(date, 'd', { locale: vi });
        const month = format(date, 'M', { locale: vi });
        const year = format(date, 'yyyy', { locale: vi });
        const capitalizedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
        return `Ngày ${capitalizedDayName} ngày ${day}/${month}/${year}`;
      }
    };

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px',
        padding: '12px 16px',
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
      }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={goToToday}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#94a3b8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
          >
            Hôm nay
          </button>
          <button
            onClick={() => navigate(Navigate.PREVIOUS)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#94a3b8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
          >
            ←
          </button>
          <button
            onClick={() => navigate(Navigate.NEXT)}
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#475569',
              fontWeight: 500,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#f1f5f9';
              e.currentTarget.style.borderColor = '#94a3b8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ffffff';
              e.currentTarget.style.borderColor = '#cbd5e1';
            }}
          >
            →
          </button>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '10px 20px',
          background: 'white',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '18px',
          }}>
            📅
          </div>
          <div>
            <div style={{
              fontSize: '18px',
              fontWeight: 700,
              color: '#1e293b',
              lineHeight: 1.2,
            }}>
              {getDateLabel()}
            </div>
          </div>
        </div>

         <div style={{ display: 'flex', gap: '8px' }}>
          {['month', 'week', 'day'].map((v) => (
            <button
              key={v}
              onClick={() => changeView(v)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: view === v ? 'none' : '1px solid #cbd5e1',
                background: view === v 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                  : '#ffffff',
                color: view === v ? '#ffffff' : '#475569',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'capitalize',
              }}
              onMouseEnter={(e) => {
                if (view !== v) {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.borderColor = '#94a3b8';
                }
              }}
              onMouseLeave={(e) => {
                if (view !== v) {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#cbd5e1';
                }
              }}
            >
              {v === 'month' ? 'Tháng' : v === 'week' ? 'Tuần' : 'Ngày'}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const components: Record<string, unknown> = {
    event: EventCustom,
    month: {
      header: MonthHeader,
    },
    week: {
      header: WeekHeader,
    },
    toolbar: CustomToolbar,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[650px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Đang tải lịch học...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        /* Day Headers - Month and Week View - Override default styles */
        .rbc-header {
          padding: 0 !important;
          background: transparent !important;
          border-bottom: none !important;
        }
        
        /* Date Cell in Month View */
        .rbc-date-cell {
          padding: 8px 4px 4px 4px !important;
          text-align: center;
        }
        
        .rbc-date-cell > a {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          color: #1e293b;
          text-decoration: none;
          transition: all 0.2s;
          background: transparent;
        }
        
        .rbc-date-cell > a:hover {
          background: #e0e7ff;
          color: #4f46e5;
        }
        
        /* Today's date in month view */
        .rbc-off-range-bg {
          background: #f8fafc;
        }
        
        .rbc-today {
          background-color: #fef3c7 !important;
        }
        
        .rbc-today .rbc-date-cell > a {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          color: #92400e;
          border: 2px solid #f59e0b;
          box-shadow: 0 2px 4px rgba(245, 158, 11, 0.2);
        }
        
        /* Week View - Day Headers */
        .rbc-time-header-content {
          border-left: 1px solid #e2e8f0;
        }
        
        .rbc-time-header-gutter {
          border-right: 1px solid #e2e8f0;
        }
        
        /* Force header to fill entire cell - áp dụng cho tất cả header */
        .rbc-time-header-content > .rbc-row > .rbc-header,
        .rbc-time-content > .rbc-time-header-content > .rbc-header {
          height: 80px !important;
          min-height: 80px !important;
          max-height: 80px !important;
          padding: 0 !important;
          margin: 0 !important;
          display: flex !important;
          align-items: stretch !important;
          justify-content: center !important;
          flex: 1 1 0% !important;
        }
        
        /* Đảm bảo row header dùng flex */
        .rbc-time-header-content > .rbc-row {
          display: flex !important;
          width: 100% !important;
        }
        
        /* Chỉ ẩn header spacer (ô thứ 8) - KHÔNG ẩn Chủ nhật */
        .rbc-time-header-content > .rbc-row > .rbc-header:nth-child(8),
        .rbc-time-header-content .rbc-header.rbc-header-scrollbar {
          display: none !important;
          width: 0 !important;
          flex: 0 0 0 !important;
        }
        
        /* Cho phép scroll dọc */
        .rbc-time-view > .rbc-time-content,
        .rbc-time-content {
          overflow-y: auto !important;
          overflow-x: hidden !important;
          scrollbar-gutter: stable;
        }
        
        /* Current time indicator */
        .rbc-current-time-indicator {
          background-color: #ef4444;
          height: 2px;
        }
        
        /* Time slots */
        .rbc-time-slot {
          border-top: 1px solid #f1f5f9;
        }
        
        .rbc-time-slot.rbc-now {
          background-color: #fef3c7;
        }
        
        /* Event styles */
        .rbc-event {
          border-radius: 6px;
          padding: 2px 4px;
        }
        
        /* Calendar toolbar - hide default */
        .rbc-toolbar {
          display: none !important;
        }
      `}</style>
      <div style={{ height: 650 }}>
        <Calendar
          ref={calendarRef}
          localizer={localizer}
          events={events}
          defaultView={Views.WEEK}
          views={['month', 'week', 'day']}
          startAccessor="start"
          endAccessor="end"
          components={components}
          style={{ height: '100%' }}
          messages={{ 
            week: 'Tuần', 
            month: 'Tháng', 
            day: 'Ngày', 
            today: 'Hôm nay',
            previous: 'Trước',
            next: 'Sau',
            agenda: 'Lịch trình'
          }}
          popup={true}
          min={new Date(1970, 1, 1, 7, 0, 0)}
          max={new Date(1970, 1, 1, 20, 0, 0)}
          step={15}
          timeslots={1}
          culture="vi"
          onSelectEvent={onSelectEvent}
          date={selectedDate}
          onNavigate={(d: Date) => onChangeDate && onChangeDate(d)}
        />
      </div>
    </>
  );
}
