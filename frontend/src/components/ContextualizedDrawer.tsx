// ContextualizedDrawer.tsx
import React from 'react';
import { Entity } from '../types';
import { X, Clock, HelpCircle, ArrowUpRight, Shield } from 'lucide-react';

interface ContextualizedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  entities: Entity[];
  onSelectCase: (entityId: string) => void;
}

export function ContextualizedDrawer({
  isOpen,
  onClose,
  entities,
  onSelectCase,
}: ContextualizedDrawerProps) {
  if (!isOpen) return null;

  // Filter the minor silent elevated blips + Arjun if partially explained
  const underReviewList = entities.filter(
    (e) => e.isSilentElevated || (e.riskLevel === 'elevated' && e.id !== 'devraj')
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-md h-full bg-[#0a0a0e] border-l border-white/[0.08] shadow-2xl p-6 flex flex-col justify-between overflow-y-auto"
        role="dialog"
        aria-modal="true"
      >
        <div>
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-100">
                  Contextualized / Under Review
                </h3>
                <p className="text-[11px] font-mono text-zinc-400">
                  Non-intrusive surveillance • Zero alert noise
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Alert Budget Thesis Note */}
          <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-amber-900/30 text-[11px] text-zinc-300 mb-5 leading-relaxed">
            <div className="flex items-center gap-1.5 font-mono font-semibold text-amber-400 mb-1">
              <Shield className="w-3.5 h-3.5" />
              <span>IKORI Alert-Budget Policy</span>
            </div>
            Minor anomalies are passive quiet nodes. They never trigger toasts or increment the
            primary notification bell unless deliberate malicious exfiltration vectors are mathematically proven.
          </div>

          {/* List of Entities */}
          <div className="space-y-3">
            {underReviewList.map((entity) => (
              <div
                key={entity.id}
                onClick={() => {
                  if (entity.hasActiveCase) {
                    onSelectCase(entity.id);
                    onClose();
                  }
                }}
                className={`p-3.5 rounded-xl border transition-all ${
                  entity.hasActiveCase
                    ? 'bg-[#0f0e13] border-amber-900/30 hover:border-amber-700/50 cursor-pointer group'
                    : 'bg-[#09090c] border-white/[0.05]'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <span className="font-semibold text-xs text-zinc-200">
                      {entity.name}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400 ml-2">
                      {entity.role}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/40 text-amber-400 border border-amber-900/40">
                    Risk {entity.riskScore}
                  </span>
                </div>

                <p className="text-[11px] text-zinc-400 leading-normal mb-2">
                  {entity.summary}
                </p>

                <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 pt-2 border-t border-white/[0.04]">
                  <span>{entity.department}</span>
                  {entity.hasActiveCase ? (
                    <span className="text-[#C6613F] flex items-center gap-1 group-hover:underline">
                      Drill into Case #{entity.caseId} <ArrowUpRight className="w-3 h-3" />
                    </span>
                  ) : (
                    <span className="text-zinc-400 italic">Passive monitoring</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer info */}
        <div className="pt-6 border-t border-white/[0.06] text-[11px] font-mono text-zinc-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" /> IKORI Context Engine
          </span>
          <span>{underReviewList.length} entities tracked</span>
        </div>
      </div>
    </div>
  );
}
