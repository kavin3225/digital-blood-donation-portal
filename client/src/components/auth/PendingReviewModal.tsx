import React from 'react';
import { Modal } from '../common/Modal';
import { AlertCircle, Mail } from 'lucide-react';

interface PendingReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string | null;
}

export const PendingReviewModal: React.FC<PendingReviewModalProps> = ({
  isOpen,
  onClose,
  message,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Registration Under Review">
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 leading-relaxed">
            <p className="font-semibold text-amber-900 mb-1">Administrative Review In Progress</p>
            <p>{message || 'Your registration submission has been flagged for coordinator review (e.g. conflicting register number or duplicate submission).'}</p>
          </div>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
          <p className="font-medium text-slate-800">Need urgent verification?</p>
          <div className="flex items-center space-x-2 text-slate-700">
            <Mail className="w-4 h-4 text-slate-400" />
            <span>blood-desk@bitsathy.ac.in</span>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            Understood
          </button>
        </div>
      </div>
    </Modal>
  );
};
