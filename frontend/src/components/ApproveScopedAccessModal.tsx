// src/components/ApproveScopedAccessModal.tsx
// Modal for approving temporary scoped access with step-up authentication and mandatory justification

import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  Clock,
  Fingerprint,
  AlertTriangle,
  X,
  CheckCircle2,
  KeyRound,
  Info,
} from 'lucide-react';
import { AccessRequestItem } from '../types';
import { SIMULATED_ENFORCEMENT_LABEL } from '../constants';

interface ApproveScopedAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: AccessRequestItem;
  reviewerName: string;
  reviewerRole: string;
  onConfirm: (params: {
    reviewerName: string;
    reviewerRole: string;
    reason: string;
    durationMinutes: number;
    stepUpVerified: boolean;
  }) => void;
}

export function ApproveScopedAccessModal({
  isOpen,
  onClose,
  request,
  reviewerName,
  reviewerRole,
  onConfirm,
}: ApproveScopedAccessModalProps) {
  const [reason, setReason] = useState<string>(
    'Verified active Sev-1 incident #88219 and approved RFC-4109 hotfix. Scoped 15-minute bastion session granted for worker pod restart.'
  );
  const [durationMinutes, setDurationMinutes] = useState<number>(15);
  const [stepUpVerified, setStepUpVerified] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a documented justification for this access grant.');
      return;
    }
    if (!stepUpVerified) {
      setError('Step-up authentication is mandatory before temporary privilege activation.');
      return;
    }
    onConfirm({
      reviewerName,
      reviewerRole,
      reason: reason.trim(),
      durationMinutes,
      stepUpVerified,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-[#0b0f19] border border-white/15 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-white/10 bg-gradient-to-r from-emerald-950/40 via-[#0b0f19] to-[#0b0f19] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-white">
                  Approve Scoped Just-in-Time Access
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {request.id}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Authorized Reviewer: <strong className="text-white">{reviewerName}</strong> ({reviewerRole})
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

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Exact Scoped Resource and Restrictions Preview */}
          <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Target Resource:</span>
              <span className="font-mono text-emerald-300 font-semibold text-xs">
                {request.resource}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Permission Level:</span>
              <span className="font-mono text-slate-200">
                Non-Root Terminal Session (Payments Bastion Only)
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Session TTL:</span>
              <span className="font-mono text-white font-bold">
                {durationMinutes} minutes (Strict auto-expiry)
              </span>
            </div>
            <div className="pt-2 border-t border-white/5 text-[11px] text-slate-400 space-y-1">
              <div className="text-slate-300 font-semibold mb-1">Mandatory Restrictions:</div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>No privilege escalation (sudo/root strictly prohibited)</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>No external file downloads or upload pipelines</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-300">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Continuous EBPF session auditing & automatic expiry</span>
              </div>
            </div>
          </div>

          {/* Step-up Authentication Requirement */}
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-start gap-3">
            <Fingerprint className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-white">Step-Up Authentication Challenge</h4>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={stepUpVerified}
                    onChange={(e) => setStepUpVerified(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-black/40 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
                  />
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    WebAuthn / FIDO2 Verified
                  </span>
                </label>
              </div>
              <p className="text-[11px] text-slate-300">
                Hardware token or biometric MFA challenge must succeed before temporary credentials activate.
              </p>
            </div>
          </div>

          {/* Mandatory Decision Reason */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 text-xs">
              Reviewer Decision Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              rows={3}
              placeholder="State the verified business justification and ticket correlation..."
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/10 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-sans leading-relaxed"
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Footer with Simulated Enforcement Badge */}
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
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Activate Scoped Access</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
