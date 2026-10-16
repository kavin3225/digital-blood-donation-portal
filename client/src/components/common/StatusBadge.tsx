import React from 'react';
import { RequestStatus } from '../../types';

interface StatusBadgeProps {
  status: RequestStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const configs: Record<RequestStatus, { label: string; bg: string; text: string; dot: string }> = {
    pending_verification: {
      label: 'Open · coordinator review',
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      dot: 'bg-amber-500',
    },
    verified: {
      label: 'Open · verified',
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
      dot: 'bg-blue-500',
    },
    broadcast: {
      label: 'Open · donors notified',
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-700 animate-pulse',
      dot: 'bg-red-600',
    },
    coordinating: {
      label: 'In progress',
      bg: 'bg-indigo-50 border-indigo-200',
      text: 'text-indigo-800',
      dot: 'bg-indigo-600',
    },
    fulfilled: {
      label: 'Fulfilled',
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-800',
      dot: 'bg-emerald-600',
    },
    rejected: {
      label: 'Rejected',
      bg: 'bg-slate-100 border-slate-200',
      text: 'text-slate-700',
      dot: 'bg-slate-400',
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'bg-slate-100 border-slate-200',
      text: 'text-slate-600',
      dot: 'bg-slate-400',
    },
    expired: {
      label: 'Expired',
      bg: 'bg-zinc-100 border-zinc-200',
      text: 'text-zinc-600',
      dot: 'bg-zinc-400',
    },
  };

  const current = configs[status] || {
    label: status,
    bg: 'bg-slate-100 border-slate-200',
    text: 'text-slate-700',
    dot: 'bg-slate-500',
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center space-x-1.5 font-medium rounded-full border ${current.bg} ${current.text} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${current.dot}`} />
      <span>{current.label}</span>
    </span>
  );
};
