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
        background: '#285BA3', // CodeGym-like blue
        borderRadius: 4,
        padding: '4px 6px',
        fontSize: 12,
        color: '#ffffff',
        fontWeight: 500,
        height: '100%',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        overflow: 'hidden',
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
    const dayName = format(date, 'EEEE', { locale: vi }); // e.g. "thứ hai"
    const dayNumber = format(date, 'd');
    
    // Capitalize first letter of dayName
    const formattedDayName = dayName.charAt(0).toUpperCase() + dayName.slice(1);
    
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 8px',
        width: '100%',
        gap: '6px',
      }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          color: isTodayDate ? '#285BA3' : '#1e293b',
        }}>
          {dayNumber}
        </div>
        <div style={{
          fontSize: 14,
          fontWeight: 500,
          color: isTodayDate ? '#285BA3' : '#64748b',
        }}>
          {formattedDayName}
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
        const weekStart = startOfWeek(date, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
        return `${format(weekStart, 'dd/MM/yyyy')} - ${format(weekEnd, 'dd/MM/yyyy')}`;
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
            background: '#285BA3',
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
          {/* Removed Month/Week/Day tabs */}
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

  // Calculate min and max times based on events
  let minTime = new Date(1970, 1, 1, 8, 0, 0); // Default 8:00
  let maxTime = new Date(1970, 1, 1, 17, 0, 0); // Default 17:00
  
  if (events && events.length > 0) {
    const minHour = Math.min(...events.map(e => e.start.getHours()));
    const maxHour = Math.max(...events.map(e => {
      const h = e.end.getHours();
      const m = e.end.getMinutes();
      return m > 0 ? h + 1 : h;
    }));
    minTime = new Date(1970, 1, 1, Math.max(0, minHour), 0, 0); 
    maxTime = new Date(1970, 1, 1, Math.min(23, maxHour), 0, 0);
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
          background-color: transparent !important;
        }
        
        /* Cho phép scroll ngang dọc cho lịch */
        
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
          background-color: transparent;
        }
        
        /* Time labels */
        .rbc-time-gutter .rbc-time-slot {
          font-weight: 700;
          color: #1e293b;
          font-size: 13px;
        }
        
        /* Event styles */
        .rbc-event {
          background: transparent !important;
          border: none !important;
          padding: 0 !important;
        }
        
        .rbc-event-label {
          display: none !important;
        }
        
        /* Calendar toolbar - hide default */
        .rbc-toolbar {
          display: none !important;
        }
      `}</style>
      <div className="overflow-x-auto w-full" style={{ height: 650 }}>
        <div style={{ minWidth: '800px', height: '100%' }}>
          <Calendar
            ref={calendarRef}
            localizer={localizer}
            events={events}
            defaultView={Views.WEEK}
            views={['week']}
            startAccessor="start"
            endAccessor="end"
            components={components}
            style={{ height: '100%' }}
            formats={{
              timeGutterFormat: (date: Date, culture?: string, local?: any) => 
                local.format(date, 'H:mm', culture),
            }}
            messages={{ 
              week: 'Tuần', 
              today: 'Hôm nay',
              previous: 'Trước',
              next: 'Sau',
            }}
            popup={true}
            min={minTime}
            max={maxTime}
            step={60}
            timeslots={1}
            culture="vi"
            onSelectEvent={onSelectEvent}
            date={selectedDate}
            onNavigate={(d: Date) => onChangeDate && onChangeDate(d)}
          />
        </div>
      </div>
    </>
  );
}
