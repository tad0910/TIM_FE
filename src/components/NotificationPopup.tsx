import React, { useState, useEffect } from 'react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}

interface NotificationPopupProps {
  notification: Notification | null;
  onClose: () => void;
}

const NotificationPopup: React.FC<NotificationPopupProps> = ({ notification, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      
      const duration = notification.duration ?? 3000;
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        
        return () => clearTimeout(timer);
      }
    }
  }, [notification]);

  const closeTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    closeTimerRef.current = setTimeout(onClose, 300);
  };

  if (!notification || !isVisible) return null;

  const getTheme = () => {
    switch (notification.type) {
      case 'success':
        return {
          icon: (
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          ),
          bg: 'bg-emerald-100',
          border: 'border-emerald-500',
          title: 'text-emerald-800'
        };
      case 'error':
        return {
          icon: (
            <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ),
          bg: 'bg-rose-100',
          border: 'border-rose-500',
          title: 'text-rose-800'
        };
      case 'warning':
        return {
          icon: (
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          ),
          bg: 'bg-amber-100',
          border: 'border-amber-500',
          title: 'text-amber-800'
        };
      case 'info':
      default:
        return {
          icon: (
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          bg: 'bg-blue-100',
          border: 'border-blue-500',
          title: 'text-blue-800'
        };
    }
  };

  const theme = getTheme();

  return (
    <div className="fixed top-20 right-4 z-[9999] max-w-[380px] w-full sm:w-auto pointer-events-none">
      <div
        className={`
          pointer-events-auto w-full bg-white rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100
          overflow-hidden transform transition-all duration-400 ease-out flex
          ${isVisible ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-12 opacity-0 scale-95'}
        `}
      >
        <div className={`w-1.5 shrink-0 ${theme.bg.replace('100', '500')}`} />
        
        <div className="p-4 flex items-start gap-3 flex-1 w-full">
          <div className={`shrink-0 w-8 h-8 rounded-full ${theme.bg} flex items-center justify-center mt-0.5`}>
            {theme.icon}
          </div>
          
          <div className="flex-1 min-w-0 pt-1">
            <h3 className={`text-[15px] font-bold ${theme.title}`}>
              {notification.title}
            </h3>
            {notification.message && (
              <p className="mt-1 text-[14px] text-gray-600 leading-relaxed">
                {notification.message}
              </p>
            )}
          </div>
          
          <button
            onClick={handleClose}
            className="shrink-0 ml-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
            aria-label="Đóng"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPopup;
