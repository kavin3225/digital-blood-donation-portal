import React, { useState } from 'react';
import { Modal } from './Modal';
import { ShieldAlert, ShieldCheck, Ban, CheckCircle2, AlertTriangle, ArrowRight, X, FileText } from 'lucide-react';
import { useTouchRipple, RippleContainer } from './TouchRipple';

interface ActionConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  title: string;
  subtitle?: string;
  decisionType: 'block' | 'approve' | 'broadcast' | 'cancel' | 'warning';
  targetInfo?: {
    name?: string;
    email?: string;
    detail?: string;
  };
  presetReasons?: string[];
  defaultReason?: string;
  confirmButtonText?: string;
  requiresReason?: boolean;
  auditNotice?: string;
}

export const ActionConfirmModal: React.FC<ActionConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  subtitle,
  decisionType,
  targetInfo,
  presetReasons = [],
  defaultReason = '',
  confirmButtonText,
  requiresReason = true,
  auditNotice = 'Action will be immutably stamped in the college audit log with administrator credentials.',
}) => {
  const [reason, setReason] = useState(defaultReason);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmRipple = useTouchRipple();

  const isBlock = decisionType === 'block' || decisionType === 'cancel';
  const isApprove = decisionType === 'approve';
  const isBroadcast = decisionType === 'broadcast';

  const handleSelectPreset = (preset: string) => {
    setReason(preset);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requiresReason && !reason.trim()) {
      setError('Please provide a reason or select a preset option.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await onConfirm(reason.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Action failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" maxWidth="max-w-lg">
      <div className="space-y-4 text-left">
        {/* Unique Institutional Header */}
        <div className="flex items-start space-x-3.5 pt-1">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md ${
              isBlock
                ? 'bg-red-100 text-red-600 border border-red-200'
                : isApprove
                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                : isBroadcast
                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                : 'bg-purple-100 text-purple-700 border border-purple-200'
            }`}
          >
            {isBlock ? (
              <Ban className="w-6 h-6" />
            ) : isApprove ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : isBroadcast ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <ShieldAlert className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-lg font-black text-slate-900 tracking-tight leading-tight">
              {title}
            </h3>
            {subtitle && <p className="text-xs text-slate-500 font-medium mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* Target Details Badge */}
        {targetInfo && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 text-xs space-y-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Target Entity
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-900">{targetInfo.name}</span>
              {targetInfo.email && (
                <span className="font-mono text-slate-500 text-[11px]">({targetInfo.email})</span>
              )}
            </div>
            {targetInfo.detail && (
              <p className="text-[11px] text-slate-600 font-medium">{targetInfo.detail}</p>
            )}
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-start space-x-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Quick Reason Presets */}
        {presetReasons.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Quick Reason Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presetReasons.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className={`text-[11px] px-2.5 py-1 rounded-xl font-medium border transition active:scale-95 text-left ${
                    reason === preset
                      ? isBlock
                        ? 'bg-red-50 border-red-300 text-red-800 font-bold'
                        : 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold'
                      : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Reason Textarea */}
        <form onSubmit={handleSubmit} className="space-y-3 pt-1">
          {requiresReason && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Reason / Administrative Note *
              </label>
              <textarea
                required
                rows={3}
                placeholder={
                  isBlock
                    ? "e.g. Fake identity claim / conflicting register number"
                    : "e.g. Verified with department HOD"
                }
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError(null);
                }}
                className="w-full text-xs p-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium"
              />
            </div>
          )}

          {/* Institutional Audit Notice */}
          <div className="text-[11px] text-slate-400 bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span>
              {auditNotice}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              onClick={(e) => confirmRipple.triggerRipple(e)}
              className={`relative touch-ripple-container px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow transition active:scale-95 disabled:opacity-50 flex items-center space-x-1.5 ${
                isBlock
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                  : isApprove
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                  : 'bg-slate-900 hover:bg-slate-800'
              }`}
            >
              <RippleContainer ripples={confirmRipple.ripples} color="rgba(255, 255, 255, 0.25)" />
              <span className="relative z-10">
                {submitting
                  ? 'Processing...'
                  : confirmButtonText || (isBlock ? 'Confirm Block' : isApprove ? 'Confirm Approval' : 'Confirm')}
              </span>
              <ArrowRight className="w-3.5 h-3.5 relative z-10" />
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
