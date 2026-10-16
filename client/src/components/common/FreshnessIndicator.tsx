import React from 'react';
import { Clock, CheckCircle2, AlertTriangle } from 'lucide-react';

interface FreshnessIndicatorProps {
  lastConfirmedDate?: string | Date;
  onRefreshClick?: () => void;
  showRefreshButton?: boolean;
}

export const FreshnessIndicator: React.FC<FreshnessIndicatorProps> = ({
  lastConfirmedDate,
  onRefreshClick,
  showRefreshButton = false,
}) => {
  if (!lastConfirmedDate) {
    return (
      <span className="inline-flex items-center space-x-1 text-xs text-slate-400">
        <Clock className="w-3.5 h-3.5" />
        <span>Unconfirmed</span>
      </span>
    );
  }

  const confirmedTime = new Date(lastConfirmedDate).getTime();
  const diffDays = Math.floor((Date.now() - confirmedTime) / (1000 * 60 * 60 * 24));
  const isStale = diffDays > 30;

  if (isStale) {
    return (
      <div className="inline-flex items-center space-x-2">
        <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          <span>Stale ({diffDays} days ago)</span>
        </span>
        {showRefreshButton && onRefreshClick && (
          <button
            onClick={onRefreshClick}
            className="text-xs text-red-600 hover:text-red-700 font-medium underline"
          >
            Re-confirm Now
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center space-x-2">
      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-800 border border-green-200">
        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
        <span>
          {diffDays === 0 ? 'Confirmed today' : `Confirmed ${diffDays} day${diffDays > 1 ? 's' : ''} ago`}
        </span>
      </span>
      {showRefreshButton && onRefreshClick && (
        <button
          onClick={onRefreshClick}
          className="text-xs text-slate-500 hover:text-slate-800 underline"
        >
          Confirm today
        </button>
      )}
    </div>
  );
};
