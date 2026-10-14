// src/components/DevrajRevocationModal.tsx
// Modal for Reviewer to approve session revocation and credential freeze for Devraj Malhotra under protective hold

import React, { useState } from 'react';
import { ShieldAlert, X, Info, AlertTriangle, UserX } from 'lucide-react';
import { SIMULATED_ENFORCEMENT_LABEL } from '../constants';

interface DevrajRevocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  reviewerName: string;
  reviewerRole: string;
  onConfirm: (params: {
    reviewerName: string;
    reviewerRole: string;
    reason: string;
  }) => void;
}

export function DevrajRevocationModal({
  isOpen,
  onClose,
  reviewerName,
  reviewerRole,
  onConfirm,
}: DevrajRevocationModalProps) {
  const [reason, setReason] = useState<string>(
    'Unapproved bulk Vault master key extraction and 4.8 GB egress toward unknown ASN confirmed malicious. Immediate session termination and enterprise credential freeze authorized.'
  );
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a formal justification for session revocation.');
      return;
    }
    onConfirm({
      reviewerName,
      reviewerRole,
      reason: reason.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#0b0f19] border border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-white/10 bg-gradient-to-r from-rose-950/60 via-[#0b0f19] to-[#0b0f19] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">
                  Approve Session Revocation
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  AR-104
                </span>
              </div>
              <p className="text-xs text-rose-300/80 mt-0.5">
                Target: Devraj Malhotra (Staff Infrastructure Engineer)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-2">
            <div className="text-rose-200 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Protective Hold Currently Engaged</span>
            </div>
            <p className="text-[11px] text-rose-300/80 leading-relaxed">
              4.8 GB outbound external upload has been held at the perimeter gateway. Approving this containment action permanently terminates all active sessions and invalidates Vault API tokens.
            </p>
            <div className="text-[10px] font-mono text-rose-400">
              Notice: No option to approve data export exists for this resource.
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1 text-xs">
              Reviewer Justification <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              rows={3}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 font-sans leading-relaxed"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>{SIMULATED_ENFORCEMENT_LABEL}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
              >
                <UserX className="w-4 h-4" />
                <span>Confirm Session Revocation</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
