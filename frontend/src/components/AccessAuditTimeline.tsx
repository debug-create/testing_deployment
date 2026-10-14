// src/components/AccessAuditTimeline.tsx
// Immutable Decision Timeline for Context-Aware Just-in-Time Access

import React from 'react';
import {
  History,
  ShieldCheck,
  UserCheck,
  Cpu,
  Clock,
  Fingerprint,
  CheckCircle2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { AccessAuditLogEvent } from '../types';

interface AccessAuditTimelineProps {
  timeline: AccessAuditLogEvent[];
}

export function AccessAuditTimeline({ timeline }: AccessAuditTimelineProps) {
  return (
    <div className="bg-[#0b0f19] border border-white/10 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#0d1424]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
            <History className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Immutable Decision Timeline</h3>
            <p className="text-xs text-slate-400">
              Tamper-evident audit chain with cryptographic ledger signatures
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Fingerprint className="w-3.5 h-3.5 text-indigo-400" />
          <span>Append-Only Ledger · {timeline.length} Records</span>
        </div>
      </div>

      <div className="p-4">
        <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
          {timeline.map((event, index) => {
            const isSystem = event.actorPersona === 'system';
            const isReviewer = event.actorPersona === 'reviewer';
            const isAnalyst = event.actorPersona === 'analyst';

            const dotColor = isReviewer
              ? 'bg-emerald-500 ring-emerald-500/20'
              : isAnalyst
              ? 'bg-amber-500 ring-amber-500/20'
              : 'bg-indigo-500 ring-indigo-500/20';

            return (
              <div key={event.id || index} className="relative group">
                {/* Node indicator */}
                <div
                  className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 border-[#0b0f19] ring-4 ${dotColor}`}
                />

                <div className="p-3.5 rounded-lg bg-white/[0.02] border border-white/5 hover:border-white/15 transition-all space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white tracking-wide">
                        {event.action}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold bg-white/5 text-slate-300 border border-white/10">
                        {event.statusAfter}
                      </span>
                      {event.stepUpVerified && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          MFA Verified
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{event.timestamp}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans">
                    {event.details}
                  </p>

                  <div className="pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 font-mono">
                    <div className="flex items-center gap-2">
                      {isSystem ? (
                        <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>
                        <strong className="text-slate-200">{event.actor}</strong> ({event.actorRole})
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-500 truncate max-w-xs font-mono" title={event.immutableHash}>
                      Hash: {event.immutableHash.substring(0, 22)}...
                    </div>
                  </div>

                  {event.policyRuleApplied && (
                    <div className="text-[10px] text-indigo-300/80 bg-indigo-500/10 px-2.5 py-1 rounded border border-indigo-500/20 font-mono">
                      Rule: {event.policyRuleApplied}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
