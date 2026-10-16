import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X, ShieldAlert } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration: number;
  timestamp: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', title?: string, duration: number = 4200) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = {
        id,
        type,
        title,
        message,
        duration,
        timestamp: Date.now(),
      };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep maximum 5 on screen

      if (duration > 0) {
        setTimeout(() => {
          dismissToast(id);
        }, duration);
      }
    },
    [dismissToast]
  );

  const toast = {
    success: useCallback((msg: string, title?: string) => showToast(msg, 'success', title), [showToast]),
    error: useCallback((msg: string, title?: string) => showToast(msg, 'error', title), [showToast]),
    warning: useCallback((msg: string, title?: string) => showToast(msg, 'warning', title), [showToast]),
    info: useCallback((msg: string, title?: string) => showToast(msg, 'info', title), [showToast]),
  };

  // Safe institutional override: intercept legacy window.alert so native popups never appear
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const originalAlert = window.alert;
      window.alert = (message?: any) => {
        const msgStr = typeof message === 'string' ? message : JSON.stringify(message);
        showToast(msgStr || 'Notification', 'info');
      };

      return () => {
        window.alert = originalAlert;
      };
    }
  }, [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, toast, dismissToast }}>
      {children}
      {/* Institutional Floating Toast Hub */}
      <div
        className="fixed top-5 right-5 z-[9999] flex flex-col space-y-3 pointer-events-none max-w-sm w-full px-3"
        role="region"
        aria-label="Institutional Notifications"
      >
        {toasts.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto transform transition-all duration-300 ease-out shadow-2xl rounded-2xl p-4 border backdrop-blur-xl flex items-start space-x-3.5 relative overflow-hidden group select-none ${
              item.type === 'success'
                ? 'bg-slate-900/95 text-white border-emerald-500/40 ring-1 ring-emerald-500/20'
                : item.type === 'error'
                ? 'bg-red-950/95 text-white border-red-500/50 ring-1 ring-red-500/20'
                : item.type === 'warning'
                ? 'bg-amber-950/95 text-amber-50 border-amber-500/40 ring-1 ring-amber-500/20'
                : 'bg-slate-900/95 text-slate-100 border-indigo-500/40 ring-1 ring-indigo-500/20'
            }`}
            style={{
              animation: 'toastSlideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            {/* Status Icon */}
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                item.type === 'success'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : item.type === 'error'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                  : item.type === 'warning'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              }`}
            >
              {item.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : item.type === 'error' ? (
                <XCircle className="w-5 h-5" />
              ) : item.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Info className="w-5 h-5" />
              )}
            </div>

            {/* Message Body */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                  {item.title ||
                    (item.type === 'success'
                      ? 'Action Verified'
                      : item.type === 'error'
                      ? 'Action Failed'
                      : item.type === 'warning'
                      ? 'Important Notice'
                      : 'Campus Desk')}
                </span>
              </div>
              <p className="text-xs font-semibold leading-relaxed text-slate-100 mt-0.5 break-words">
                {item.message}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => dismissToast(item.id)}
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition flex-shrink-0"
              aria-label="Dismiss toast"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Live Progress Countdown Indicator */}
            {item.duration > 0 && (
              <div
                className={`absolute bottom-0 left-0 right-0 h-0.5 origin-left ${
                  item.type === 'success'
                    ? 'bg-emerald-400'
                    : item.type === 'error'
                    ? 'bg-red-400'
                    : item.type === 'warning'
                    ? 'bg-amber-400'
                    : 'bg-indigo-400'
                }`}
                style={{
                  animation: `toastCountdown ${item.duration}ms linear forwards`,
                }}
              />
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
