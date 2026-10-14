// EscalationToast.tsx
// Displays anomaly toast when high-risk drift is escalated.
// Plays a calm, synthesized two-tone notification ping via Web Audio API.

import React, { useEffect } from 'react';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';
import { PersonaAvatar } from './PersonaAvatar';
import { playAnomalyChime } from '../utils/audioAlert';

interface EscalationToastProps {
  isVisible: boolean;
  caseId?: string;
  actorName?: string;
  residualRisk?: number;
  primaryCause?: string;
  onReview: () => void;
  onDismiss: () => void;
}

export function EscalationToast({
  isVisible,
  caseId = '104',
  actorName = 'Devraj Malhotra',
  residualRisk = 98.4,
  primaryCause = 'Singapore ASN ingress + Vault master key read + 4.8 GB S3 dump',
  onReview,
  onDismiss,
}: EscalationToastProps) {
  // Trigger audio alert when toast opens
  useEffect(() => {
    if (isVisible) {
      playAnomalyChime();
    }
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className="w-full pointer-events-auto rounded-xl bg-[#0e0707] border border-[#E8342A]/50 shadow-2xl shadow-[#E8342A]/25 p-4 animate-in slide-in-from-top-4 fade-in duration-300 text-zinc-100 backdrop-blur-xl"
    >
      <div className="flex items-start gap-3">
        {/* Avatar / Red Icon Chrome */}
        <div className="relative shrink-0 mt-0.5">
          <PersonaAvatar
            name={actorName}
            size="md"
            status="escalated"
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#E8342A] tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-[#E8342A] animate-pulse" />
              <span>Escalation · Case #{caseId}</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              aria-label="Dismiss escalation notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Dynamic real data copy */}
          <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">
            <strong className="text-white font-medium">{actorName}</strong> — residual risk{' '}
            <span className="text-[#E8342A] font-bold font-mono">
              {residualRisk}/100
            </span>
            . <span className="text-zinc-400">{primaryCause}</span>
          </p>

          {/* CTA Button */}
          <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/10">
            <span className="text-[10px] font-mono text-zinc-400">
              Simulated enforcement
            </span>
            <button
              onClick={onReview}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#E8342A] text-white hover:bg-[#E8342A]/90 transition-all shadow-md shadow-[#E8342A]/20 cursor-pointer group"
            >
              <span>Review case</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
