import React, { useState } from 'react';
import { useNotification } from '../context/NotificationContext';
import { api } from '../services/api';
import { NotificationItem } from '../types';
import { Bell, CheckCheck, Radio, Sparkles, AlertCircle, Clock, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotificationCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    requestPushPermission,
    pushPermissionState,
    refreshNotifications,
  } = useNotification();

  const [testSending, setTestSending] = useState(false);
  const [testResultNotice, setTestResultNotice] = useState<string | null>(null);
  const webPushPublicKey = (import.meta as any).env?.VITE_WEB_PUSH_VAPID_PUBLIC_KEY || '';

  const handleSendTest = async () => {
    try {
      setTestSending(true);
      const res = await api.sendTestNotification();
      if (res.success) {
        setTestResultNotice(res.result?.message || 'Test notification dispatched!');
        refreshNotifications();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to trigger test notification');
    } finally {
      setTestSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {notifications.some((item) => item.type === 'emergency_broadcast' && !item.read) && <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-300 bg-rose-700 px-5 py-4 text-white shadow-lg shadow-rose-900/10"><AlertCircle className="h-5 w-5 shrink-0" /><div><p className="text-sm font-bold">Emergency campus alert</p><p className="mt-0.5 text-xs text-rose-100">Open the alert below for location and blood group details.</p></div></div>}
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold">
              <Bell className="w-3.5 h-3.5" />
              <span>Multi-Channel Emergency Alerts</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Notification Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Track in-app broadcasts, web push delivery records, and emergency alerts.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center space-x-1"
              >
                <CheckCheck className="w-4 h-4 text-green-600" />
                <span>Mark All Read</span>
              </button>
            )}
          </div>
        </div>

        {/* Browser Push Permission Banner */}
        <div className="p-5 bg-gradient-to-r from-red-50 to-orange-50 rounded-3xl border border-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <Radio className="w-4 h-4 text-red-600" />
              <span>Web Push Notification Status</span>
            </h3>
            <p className="text-xs text-slate-600">{webPushPublicKey ? <>Browser Push Permission: <span className="font-bold uppercase text-slate-900 font-mono">{pushPermissionState}</span></> : 'Browser push requires VAPID keys in both server and client configuration. Your in-app inbox is active.'}</p>
          </div>

          <div className="flex items-center space-x-2">
            {webPushPublicKey && pushPermissionState !== 'granted' && (
              <button
                type="button"
                onClick={requestPushPermission}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow"
              >
                Enable Push Notifications
              </button>
            )}
            <button
              type="button"
              onClick={handleSendTest}
              disabled={testSending}
              className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 inline mr-1 text-amber-500" />
              <span>{testSending ? 'Sending...' : 'Send Test Alert'}</span>
            </button>
          </div>
        </div>

        {testResultNotice && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-2xl text-xs text-green-800 font-medium">
            {testResultNotice}
          </div>
        )}

        {/* Notifications Feed */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800">Alerts & Delivery History ({notifications.length})</h2>

          {notifications.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
              <Bell className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Notifications</h3>
              <p className="text-xs text-slate-500">You are all caught up! Emergency broadcasts will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n: NotificationItem) => (
                <div
                  key={n._id}
                  onClick={() => !n.read && markAsRead(n._id)}
                  className={`p-5 rounded-3xl border transition flex flex-col sm:flex-row sm:items-start justify-between gap-4 cursor-pointer ${
                    n.read
                      ? 'bg-white border-slate-200 opacity-80'
                      : 'bg-white border-red-200 shadow-sm ring-1 ring-red-100'
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2">
                      {!n.read && <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />}
                      <span className="font-bold text-xs text-slate-900">{n.title}</span>
                      {n.metadata?.priorityMatch && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">Nearby blood-group match</span>}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 text-slate-600 uppercase">
                        {n.channel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{n.body}</p>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono pt-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {n.requestId && <button type="button" onClick={(event) => { event.stopPropagation(); if (!n.read) void markAsRead(n._id); navigate('/portal'); }} className="rounded-lg bg-rose-700 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-800">View Request</button>}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        n.deliveryStatus === 'acknowledged'
                          ? 'bg-green-100 text-green-800'
                          : n.deliveryStatus === 'provider_accepted'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {n.deliveryStatus.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
