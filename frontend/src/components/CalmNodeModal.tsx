// CalmNodeModal.tsx
import React from 'react';
import { Entity } from '../types';
import { X, ShieldCheck, User, Calendar, Activity } from 'lucide-react';

interface CalmNodeModalProps {
  entity: Entity | null;
  onClose: () => void;
}

export function CalmNodeModal({ entity, onClose }: CalmNodeModalProps) {
  if (!entity) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md bg-[#0c0c10] border border-white/[0.1] rounded-2xl p-6 shadow-2xl text-zinc-100"
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with avatar icon */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-white/[0.08] flex items-center justify-center text-zinc-300 shrink-0">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white leading-tight">
              {entity.name}
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {entity.role} • {entity.department}
            </p>
          </div>
        </div>

        {/* State Banner: No Active Case */}
        <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-white/[0.06] mb-4 flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-mono font-medium text-zinc-300">
              No active case
            </div>
            <div className="text-[11px] text-zinc-400">
              Activity baseline within expected engineering bounds.
            </div>
          </div>
        </div>

        {/* Telemetry info */}
        <div className="space-y-2 text-xs font-mono mb-5">
          <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" /> Baseline Score
            </span>
            <span className="text-zinc-300 font-semibold">{entity.riskScore} / 100</span>
          </div>
          <div className="flex items-center justify-between py-1.5 border-b border-white/[0.04]">
            <span className="text-zinc-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Last Active
            </span>
            <span className="text-zinc-300">{entity.lastActive}</span>
          </div>
          <div className="pt-1 text-[11px] font-sans text-zinc-400 leading-relaxed">
            {entity.summary}
          </div>
        </div>

        {/* Action button to dismiss */}
        <button
          onClick={onClose}
          className="w-full py-2 px-4 rounded-xl text-xs font-mono font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
