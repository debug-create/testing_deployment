// src/components/ContextEvidenceChecklist.tsx
// Displays the structured Context Evidence Checklist for Context-Aware Just-in-Time Access

import React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  ExternalLink,
  ShieldCheck,
  FileCheck2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
import { ContextEvidenceItem } from '../types';

interface ContextEvidenceChecklistProps {
  evidence: ContextEvidenceItem[];
  employeeName: string;
}

export function ContextEvidenceChecklist({ evidence, employeeName }: ContextEvidenceChecklistProps) {
  const verifiedCount = evidence.filter((e) => e.status === 'verified').length;
  const missingCount = evidence.filter((e) => e.status === 'missing').length;
  const warningCount = evidence.filter((e) => e.status === 'warning').length;

  return (
    <div className="bg-[#0b0f19] border border-white/10 rounded-xl overflow-hidden shadow-xl">
      <div className="p-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#0d1424]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Context & Evidence Verification</h3>
            <p className="text-xs text-slate-400">
              Correlated with live enterprise IT, ITSM, and on-call schedule feeds
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            {verifiedCount} Verified
          </span>
          {missingCount > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20">
              {missingCount} Missing
            </span>
          )}
          {warningCount > 0 && (
            <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20">
              {warningCount} Warning
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-white/5">
        {evidence.map((item) => {
          const isVerified = item.status === 'verified';
          const isMissing = item.status === 'missing';
          const isWarning = item.status === 'warning';

          return (
            <div
              key={item.id}
              className="p-3.5 hover:bg-white/[0.02] transition-colors flex items-start justify-between gap-3 text-xs"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {isVerified && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  {isMissing && <XCircle className="w-4 h-4 text-rose-400" />}
                  {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400" />}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200 text-xs">{item.title}</span>
                    {item.referenceId && (
                      <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-white/5 text-slate-300 border border-white/10">
                        {item.referenceId}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 mt-0.5 leading-relaxed text-[11px]">{item.detail}</p>
                  <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-mono">
                    <span>Source: {item.source}</span>
                    {item.timestamp && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-600" />
                        {item.timestamp}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="shrink-0">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border ${
                    isVerified
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : isMissing
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                  }`}
                >
                  {item.status}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
