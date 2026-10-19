import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { NotificationItem } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  requestPushPermission: () => Promise<boolean>;
  pushPermissionState: NotificationPermission;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const decodeVapidKey = (base64String: string): ArrayBuffer => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (char) => char.charCodeAt(0)).buffer as ArrayBuffer;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [pushPermissionState, setPushPermissionState] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
  );
  const seenNotificationIds = useRef<Set<string> | null>(null);

  useEffect(() => {
    seenNotificationIds.current = null;
  }, [user?.email]);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setLoading(true);
      const res = await api.getMyNotifications();
      if (res.success) {
        const latestNotifications = res.notifications || [];
        if (seenNotificationIds.current === null) {
          seenNotificationIds.current = new Set(latestNotifications.map((item: NotificationItem) => item._id));
        } else {
          const newEmergencyAlerts = latestNotifications.filter((item: NotificationItem) =>
            item.type === 'emergency_broadcast' && !seenNotificationIds.current?.has(item._id)
          );
          latestNotifications.forEach((item: NotificationItem) => seenNotificationIds.current?.add(item._id));
          newEmergencyAlerts.slice(0, 3).forEach((item: NotificationItem) => {
            showToast(item.body, 'warning', item.title, 10000);
          });
          if (newEmergencyAlerts.length > 3) {
            showToast(`${newEmergencyAlerts.length - 3} more campus blood request alerts arrived.`, 'info', 'More emergency alerts');
          }
        }
        setNotifications(latestNotifications);
        setUnreadCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    const refreshOnFocus = () => void fetchNotifications();
    window.addEventListener('focus', refreshOnFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', refreshOnFocus);
    };
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => (n._id === id ? { ...n, read: true, deliveryStatus: 'acknowledged' } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = useCallback(async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications(prev =>
        prev.map(n => ({ ...n, read: true, deliveryStatus: 'acknowledged' }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const requestPushPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop or web push notifications.');
      return false;
    }

    const vapidPublicKey = (import.meta as any).env?.VITE_WEB_PUSH_VAPID_PUBLIC_KEY || '';
    if (!vapidPublicKey) {
      alert('Browser push is not configured for this deployment. In-app alerts remain available; ask the portal administrator to configure the VAPID public key.');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setPushPermissionState(permission);

      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(vapidPublicKey),
        });
        await api.subscribeDeviceToken(subscription.toJSON());
        return true;
      }
      return false;
    } catch (err) {
      console.error('Push notification permission error:', err);
      alert((err as any)?.message || 'Browser push could not be enabled. In-app notifications remain available.');
      return false;
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refreshNotifications: fetchNotifications,
        markAsRead,
        markAllAsRead,
        requestPushPermission,
        pushPermissionState,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};
