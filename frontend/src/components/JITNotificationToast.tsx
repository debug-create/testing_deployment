// src/components/JITNotificationToast.tsx
// Toast notifying SOC Analyst and Authorized Reviewer that an access request was paused before exposure

import React from 'react';
import { Clock, ArrowRight, X, ShieldAlert, Key } from 'lucide-react';
import { PersonaAvatar } from './PersonaAvatar';
import { SIMULATED_ENFORCEMENT_LABEL } from '../constants';

interface JITNotificationToastProps {
  isVisible: boolean;
  requestId?: string;
  employeeName?: string;
  resourceName?: string;
  onReview: () => void;
  onDismiss: () => void;
}

export function JITNotificationToast({
  isVisible,
  requestId = 'AR-203',
  employeeName = 'Priya Ramesh',
  resourceName = 'Payments Production Bastion',
  onReview,
  onDismiss,
}: JITNotificationToastProps) {
  if (!isVisible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="w-full pointer-events-auto rounded-xl bg-[#090e1a] border border-amber-500/40 shadow-2xl shadow-amber-500/20 p-4 animate-in slide-in-from-top-4 fade-in duration-300 text-zinc-100 backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        <div className="relative shrink-0 mt-0.5">
          <PersonaAvatar name={employeeName} size="md" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-amber-400 tracking-wider uppercase">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>Access Request Paused · {requestId}</span>
            </div>
            <button
              onClick={onDismiss}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
            <strong className="text-white font-medium">{employeeName}</strong> attempted access to{' '}
            <span className="text-amber-300 font-mono font-semibold">{resourceName}</span>.
            <span className="block text-[11px] text-zinc-400 mt-0.5">
              Held prior to data exposure. Off-hours pattern requires context review.
            </span>
          </p>

          <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-[10px] font-mono text-zinc-400">
              {SIMULATED_ENFORCEMENT_LABEL}
            </span>
            <button
              onClick={onReview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-amber-500 text-black hover:bg-amber-400 transition-all shadow-md shadow-amber-500/20 cursor-pointer group"
            >
              <span>Review JIT Access</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
