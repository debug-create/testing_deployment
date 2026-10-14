// StatusBadge.tsx
import React from 'react';
import { CaseStatus, RiskLevel, BehaviorClassification } from '../types';
import { Check, Clock, AlertCircle, RotateCcw, HelpCircle, Flame } from 'lucide-react';

interface StatusBadgeProps {
  status?: CaseStatus;
  riskLevel: RiskLevel;
  riskScore: number;
  classification?: BehaviorClassification;
  size?: 'sm' | 'md';
}

export function StatusBadge({
  status,
  riskLevel,
  riskScore,
  classification,
  size = 'sm',
}: StatusBadgeProps) {
  // 1. Indeterminate classification (neutral/grey treatment, not red or amber)
  if (classification === 'indeterminate' || status === 'Indeterminate Baseline') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-medium rounded border ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } bg-zinc-800/90 border-zinc-600/60 text-zinc-300 shadow-sm`}
        title="Indeterminate: Insufficient historical evidence or context telemetry to classify"
      >
        <HelpCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Indeterminate ({riskScore})</span>
      </span>
    );
  }

  // 2. Cleared (checkmark, calm desaturated terracotta - NOT green)
  if (status === 'Cleared' || riskLevel === 'resolved') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-medium rounded border ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } bg-[#C6613F]/10 border-[#C6613F]/30 text-[#C6613F]`}
      >
        <Check className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Cleared</span>
      </span>
    );
  }

  // 3. Containment Recommended (Containment action logged)
  if (status === 'Containment Recommended') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-medium rounded border ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } bg-rose-950/60 border-rose-600/50 text-rose-300 shadow-sm`}
      >
        <Flame className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Containment Recommended</span>
      </span>
    );
  }

  // 4. Reopened (system-triggered auto-reopen)
  if (status === 'Reopened') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-medium rounded border ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } bg-[#1f120c] border-[#C6613F]/70 text-[#ff7e54] shadow-sm`}
        title="System Reopen: Post-clearance anomalous drift detected"
      >
        <RotateCcw className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Reopened (System)</span>
      </span>
    );
  }

  // 5. Escalated (Open) -> red
  if (riskLevel === 'escalated' || status === 'Open') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-medium rounded border ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } bg-[#E8342A]/10 border-[#E8342A]/30 text-[#E8342A] animate-pulse`}
      >
        <AlertCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Escalated ({riskScore})</span>
      </span>
    );
  }

  // 6. Reviewing / Elevated -> amber/in-progress
  if (riskLevel === 'elevated' || status === 'Reviewing') {
    return (
      <span
        className={`inline-flex items-center gap-1 font-mono font-medium rounded border ${
          size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
        } bg-amber-950/40 border-amber-800/40 text-amber-400`}
      >
        <Clock className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
        <span>Reviewing</span>
      </span>
    );
  }

  // 7. Calm (Standard quiet state)
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono font-medium rounded border ${
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
      } bg-zinc-900/60 border-white/[0.06] text-zinc-400`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
      <span>Calm ({riskScore})</span>
    </span>
  );
}

// Standalone Risk Classification Badge
export function ClassificationBadge({
  classification,
  size = 'sm',
}: {
  classification: BehaviorClassification;
  size?: 'sm' | 'md';
}) {
  switch (classification) {
    case 'indeterminate':
      return (
        <span
          className={`inline-flex items-center gap-1 font-mono font-medium rounded border ${
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          } bg-zinc-800/80 border-zinc-600/50 text-zinc-300`}
        >
          <HelpCircle className="w-3 h-3 text-zinc-400" />
          <span>Indeterminate</span>
        </span>
      );
    case 'explained':
    case 'Cleared':
      return (
        <span
          className={`inline-flex items-center gap-1 font-mono font-medium rounded border ${
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          } bg-[#C6613F]/10 border-[#C6613F]/30 text-[#C6613F]`}
        >
          <Check className="w-3 h-3 text-[#C6613F]" />
          <span>Explained</span>
        </span>
      );
    case 'partial':
      return (
        <span
          className={`inline-flex items-center gap-1 font-mono font-medium rounded border ${
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          } bg-amber-950/40 border-amber-800/40 text-amber-400`}
        >
          <Clock className="w-3 h-3 text-amber-400" />
          <span>Partially Explained</span>
        </span>
      );
    case 'unexplained':
    case 'Containment Recommended':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 font-mono font-medium rounded border ${
            size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
          } bg-[#E8342A]/10 border-[#E8342A]/30 text-[#E8342A]`}
        >
          <AlertCircle className="w-3 h-3 text-[#E8342A]" />
          <span>Unexplained Deviation</span>
        </span>
      );
  }
}
