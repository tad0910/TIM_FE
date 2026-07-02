import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

export default function CalendarMini({ value, onChange }: { value: Date, onChange: (date: Date) => void }) {
  return (
    <div className="calendar-mini-wrapper">
      <style>{`
        .calendar-mini-wrapper .react-calendar {
          width: 100%;
          border: none;
          font-family: inherit;
          background: transparent;
        }
        
        .calendar-mini-wrapper .react-calendar__navigation {
          display: flex;
          height: 44px;
          margin-bottom: 1em;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 0.5em;
        }
        
        .calendar-mini-wrapper .react-calendar__navigation button {
          min-width: 44px;
          background: none;
          font-size: 14px;
          font-weight: 600;
          color: #374151;
          border: none;
          padding: 0;
        }
        
        .calendar-mini-wrapper .react-calendar__navigation button:enabled:hover,
        .calendar-mini-wrapper .react-calendar__navigation button:enabled:focus {
          background-color: #f3f4f6;
          border-radius: 6px;
        }
        
        .calendar-mini-wrapper .react-calendar__navigation button[disabled] {
          color: #9ca3af;
        }
        
        .calendar-mini-wrapper .react-calendar__month-view__weekdays {
          text-align: center;
          text-transform: uppercase;
          font-weight: 600;
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 0.5em;
        }
        
        .calendar-mini-wrapper .react-calendar__month-view__weekdays__weekday {
          padding: 0.5em;
        }
        
        .calendar-mini-wrapper .react-calendar__month-view__weekdays__weekday abbr {
          text-decoration: none;
        }
        
        .calendar-mini-wrapper .react-calendar__month-view__days {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
        
        .calendar-mini-wrapper .react-calendar__tile {
          max-width: 100%;
          aspect-ratio: 1;
          background: none;
          text-align: center;
          font-size: 13px;
          color: #374151;
          border: none;
          border-radius: 6px;
          padding: 0.5em 0;
          transition: all 0.2s;
        }
        
        .calendar-mini-wrapper .react-calendar__tile:enabled:hover,
        .calendar-mini-wrapper .react-calendar__tile:enabled:focus {
          background-color: #f1f5f9;
          color: #285BA3;
        }
        
        .calendar-mini-wrapper .react-calendar__tile--now {
          background: #f8fafc;
          font-weight: 700;
          color: #285BA3;
          border: 1px solid #e2e8f0;
          box-shadow: none;
        }
        
        .calendar-mini-wrapper .react-calendar__tile--now:enabled:hover,
        .calendar-mini-wrapper .react-calendar__tile--now:enabled:focus {
          background: #e2e8f0;
          color: #1e40af;
          border-color: #cbd5e1;
          box-shadow: none;
          transform: none;
        }
        
        .calendar-mini-wrapper .react-calendar__tile--active {
          background: #285BA3 !important;
          color: white !important;
          font-weight: 600;
        }
        
        .calendar-mini-wrapper .react-calendar__tile--active:enabled:hover,
        .calendar-mini-wrapper .react-calendar__tile--active:enabled:focus {
          background: #1E3A8A !important;
          color: white !important;
        }
        
        .calendar-mini-wrapper .react-calendar__tile--neighboringMonth {
          color: #d1d5db;
        }
        
        .calendar-mini-wrapper .react-calendar__tile--neighboringMonth:enabled:hover {
          color: #9ca3af;
        }
      `}</style>
      <Calendar 
        value={value} 
        onChange={onChange} 
        locale="vi-VN" 
        className="calendar-mini" 
      />
    </div>
  );
}
