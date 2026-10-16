import React from 'react';
import { Modal } from '../common/Modal';
import { Ban, ShieldAlert } from 'lucide-react';

interface BlockedAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: string | null;
}

export const BlockedAccountModal: React.FC<BlockedAccountModalProps> = ({
  isOpen,
  onClose,
  message,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Account Deactivated">
      <div className="space-y-4">
        <div className="p-4 bg-red-50 rounded-xl border border-red-200 flex items-start space-x-3">
          <Ban className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-red-800 leading-relaxed">
            <p className="font-semibold text-red-900 mb-1">Access Restricted</p>
            <p>{message || 'This student account has been suspended or deactivated by college administrative policy.'}</p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          If you believe this status was applied in error, please contact a portal administrator.
        </p>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
