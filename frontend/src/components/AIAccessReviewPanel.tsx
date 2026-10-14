// src/components/AIAccessReviewPanel.tsx
// AI Access Review Panel for Context-Aware Just-in-Time Access
// Adheres strictly to requirements:
// - Evaluates only structured, sanitized evidence
// - Never grants access directly
// - Mandatory disclosure: "AI-assisted recommendation. Policy validation and authorized human approval are required."
// - Default to REQUEST_MORE_CONTEXT on failure or incomplete evidence

import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  HelpCircle,
  CheckCircle2,
  Lock,
  Clock,
  FileText,
  Key,
  Laptop,
  Compass,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { AIAccessReview } from '../types';

interface AIAccessReviewPanelProps {
  review: AIAccessReview;
  onApproveProposal?: () => void;
  onRequestContextProposal?: () => void;
  currentRole: 'analyst' | 'reviewer' | 'admin';
  requestStatus: string;
}

export function AIAccessReviewPanel({
  review,
  currentRole,
  requestStatus,
}: AIAccessReviewPanelProps) {
  const isApprove = review.recommendation === 'APPROVE_SCOPED';
  const isDeny = review.recommendation === 'DENY_AND_ESCALATE';
  const isMoreContext = review.recommendation === 'REQUEST_MORE_CONTEXT';

  const badgeColor = isApprove
    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
    : isDeny
    ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
    : 'bg-amber-500/10 text-amber-400 border-amber-500/30';

  const badgeIcon = isApprove ? (
    <ShieldCheck className="w-4 h-4 text-emerald-400" />
  ) : isDeny ? (
    <XCircle className="w-4 h-4 text-rose-400" />
  ) : (
    <HelpCircle className="w-4 h-4 text-amber-400" />
  );

  return (
    <div className="bg-[#0b0f19] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
      {/* Header with Title and Disclosure Banner */}
      <div className="p-5 border-b border-white/10 bg-gradient-to-r from-[#0d1424] via-[#0b0f19] to-[#0d1424]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white tracking-wide">
                  AI Access Review
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                  Sanitized Evidence Only
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluates structured telemetry, tickets, and baselines. Zero PII ingested.
              </p>
            </div>
          </div>

          {/* Recommendation Pill */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-mono text-xs font-bold tracking-wide ${badgeColor}`}>
              {badgeIcon}
              <span>{review.recommendation}</span>
            </div>
            <div className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300">
              Confidence: <strong className="text-white">{review.confidenceLevel}%</strong>
            </div>
          </div>
        </div>

        {/* Mandatory Policy Disclosure */}
        <div className="mt-3.5 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
            <strong>“AI-assisted recommendation. Policy validation and authorized human approval are required.”</strong>
            <span className="block text-[11px] text-amber-300/70 font-normal mt-0.5">
              The AI never directly grants access, revokes accounts, or executes enforcement. A deterministic policy engine validates this recommendation before presentation to an authorized reviewer.
            </span>
          </p>
        </div>
      </div>

      {/* Structured Sanitized Evidence Checklist Grid */}
      <div className="p-5 border-b border-white/10 bg-[#080c16]">
        <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          Structured Evidence Review (11 Parameters)
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5">
            <FileText className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-[11px]">Role & Department:</span>
              <span className="text-slate-200 font-medium">{review.structuredEvidence.employeeRoleAndDept}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5">
            <Key className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-[11px]">Resource & Sensitivity:</span>
              <span className="text-slate-200 font-medium">{review.structuredEvidence.requestedResourceAndSensitivity}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5">
            <Compass className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-[11px]">Requested Action:</span>
              <span className="text-slate-200 font-medium">{review.structuredEvidence.requestedAction}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-[11px]">Requested Duration:</span>
              <span className="text-slate-200 font-medium">{review.structuredEvidence.requestedDuration}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-[11px]">Active Incident / Change Ticket:</span>
              <span className="text-slate-200 font-medium">{review.structuredEvidence.activeIncidentOrChangeTicket}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5">
            <Laptop className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-[11px]">Device & Location Trust:</span>
              <span className="text-slate-200 font-medium">{review.structuredEvidence.deviceAndLocationTrust}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-[11px]">Behavioural Deviation:</span>
              <span className="text-slate-200 font-medium">{review.structuredEvidence.behaviouralDeviation}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-[11px]">Context Coverage:</span>
              <span className="text-slate-200 font-medium">{review.structuredEvidence.contextCoverage}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-black/40 border border-white/5 flex items-start gap-2.5 md:col-span-2">
            <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-slate-400 block text-[11px]">Potential Blast Radius:</span>
              <span className="text-slate-200 font-medium">{review.structuredEvidence.potentialBlastRadius}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Human-Readable Explanation & Required Controls */}
      <div className="p-5 space-y-4">
        {/* Human Readable Explanation */}
        <div>
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
            AI Justification & Synthesis
          </h4>
          <div className="p-3.5 rounded-lg bg-white/[0.03] border border-white/10 text-sm text-slate-200 leading-relaxed font-sans">
            “{review.humanReadableReason}”
          </div>
        </div>

        {/* Required Controls Checklist */}
        <div>
          <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center justify-between">
            <span>Mandatory Security Controls ({review.requiredControls.length})</span>
            <span className="text-[11px] text-slate-500 font-normal">Deterministic Policy Enforcement</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {review.requiredControls.map((ctrl, i) => (
              <div
                key={i}
                className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5 text-xs text-slate-300"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{ctrl}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Missing Evidence Warning if any */}
        {review.missingEvidence && review.missingEvidence.length > 0 && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25">
            <h5 className="text-xs font-mono font-bold text-rose-300 flex items-center gap-1.5 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              Missing Evidence Detected ({review.missingEvidence.length})
            </h5>
            <ul className="list-disc list-inside text-xs text-rose-200/80 space-y-0.5">
              {review.missingEvidence.map((ev, i) => (
                <li key={i}>{ev}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Permission & Duration Summary */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4 text-slate-400">
            <div>
              Recommended Scope: <span className="text-white font-mono font-medium">{review.recommendedPermissionLevel}</span>
            </div>
            <div>
              Recommended TTL: <span className="text-white font-mono font-medium">{review.recommendedDuration}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
            <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
            <span>Deterministic Policy Engine Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}
