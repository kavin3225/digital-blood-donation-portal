import React, { useEffect } from 'react';
import { useNotification } from '../context/NotificationContext';
import { NotificationItem } from '../types';
import { Bell, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const NotificationCenterPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    markAsRead,
    markAllAsRead,
  } = useNotification();

  useEffect(() => {
    void markAllAsRead();
  }, [markAllAsRead]);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold">
              <Bell className="w-3.5 h-3.5" />
              <span>In-App Alerts</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Notification Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">View emergency broadcasts and updates from the portal.</p>
          </div>
        </div>

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
