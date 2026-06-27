import { useState, useEffect } from 'react';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  onClose?: () => void;
}

function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getToastStyles = () => {
    const baseStyles = "fixed top-4 right-4 z-[9999] max-w-sm p-4 rounded-lg shadow-lg transform transition-all duration-300";
    
    switch (type) {
      case 'success':
        return `${baseStyles} bg-green-500 text-white`;
      case 'error':
        return `${baseStyles} bg-red-500 text-white`;
      case 'warning':
        return `${baseStyles} bg-yellow-500 text-black`;
      case 'info':
        return `${baseStyles} bg-blue-500 text-white`;
      default:
        return `${baseStyles} bg-gray-500 text-white`;
    }
  };

  if (!isVisible) return null;

  return (
    <div className={getToastStyles()}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={() => {
            setIsVisible(false);
            setTimeout(() => onClose?.(), 300);
          }}
          className="ml-4 text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export { Toast };
export default Toast;


export function useToast() {
  const [toasts, setToasts] = useState<Array<ToastProps & { id: string }>>([]);

  const addToast = (toast: Omit<ToastProps, 'onClose'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast = {
      ...toast,
      id,
      onClose: () => removeToast(id)
    };
    setToasts(prev => [...prev, newToast]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showSuccess = (message: string) => addToast({ message, type: 'success' });
  const showError = (message: string) => addToast({ message, type: 'error' });
  const showWarning = (message: string) => addToast({ message, type: 'warning' });
  const showInfo = (message: string) => addToast({ message, type: 'info' });

  return {
    toasts,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
}
