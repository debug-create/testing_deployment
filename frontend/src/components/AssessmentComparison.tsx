// src/components/AssessmentComparison.tsx
// Phase 4: Prominent Original vs. Current Assessment Comparison Component
// Displays immutable assessment records, numerical deltas, and context revision provenance.

import React, { useState } from 'react';
import {
  GitCommit,
  Clock,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  FileCheck,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { AssessmentDetail, ContextRevision } from '../types';

interface AssessmentComparisonProps {
  originalAssessment?: AssessmentDetail;
  currentAssessment?: AssessmentDetail;
  revisionsBetween?: ContextRevision[];
  retroactiveReviewRequired?: boolean;
}

export const AssessmentComparison: React.FC<AssessmentComparisonProps> = ({
  originalAssessment,
  currentAssessment,
  revisionsBetween = [],
  retroactiveReviewRequired = false,
}) => {
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // If no original assessment, fallback to current
  const effectiveCurrent = currentAssessment || originalAssessment;
  if (!effectiveCurrent) return null;

  const hasReassessment =
    originalAssessment &&
    currentAssessment &&
    (originalAssessment.id !== currentAssessment.id ||
      originalAssessment.assessed_at !== currentAssessment.assessed_at ||
      originalAssessment.residual_risk !== currentAssessment.residual_risk);

  const deltaRisk = originalAssessment && currentAssessment
    ? Number(((currentAssessment.residual_risk ?? 0) - (originalAssessment.residual_risk ?? 0)).toFixed(1))
    : 0;

  const deltaCoverage = originalAssessment && currentAssessment
    ? Math.round(((currentAssessment.risk_weighted_coverage ?? 0) - (originalAssessment.risk_weighted_coverage ?? 0)) * 100)
    : 0;

  const deltaPriority = originalAssessment && currentAssessment
    ? Number(((currentAssessment.priority_score ?? 0) - (originalAssessment.priority_score ?? 0)).toFixed(1))
    : 0;

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0d12] p-5 mb-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/20 text-[#C6613F]">
            <GitCommit className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {hasReassessment ? 'Immutable Assessment History & Reassessment' : 'Current Forensic Assessment'}
            </h3>
            <p className="text-xs text-white/50">
              {hasReassessment
                ? 'Original baseline is preserved. Revised assessment reflects validated contextual revisions.'
                : 'Scored against authenticated event evidence and access policies.'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors px-2.5 py-1 rounded-md bg-white/5 border border-white/10"
        >
          <span>Technical IDs</span>
          {showTechnicalDetails ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Retroactive Review Persistent Banner */}
      {retroactiveReviewRequired && (
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-amber-200">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <strong className="font-semibold block mb-0.5 text-amber-300">Retroactive-Justification Review Required</strong>
            Context was created or approved after relevant activity occurred. The revised assessment requires retroactive justification review. The original assessment remains preserved.
          </div>
        </div>
      )}

      {/* Assessment Cards Grid */}
      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original Assessment Card */}
        {hasReassessment && originalAssessment && (
          <div className="rounded-lg border border-white/10 bg-black/40 p-4 relative">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-white/10 text-white/70">
                <Clock className="h-3 w-3" /> Original Assessment
              </span>
              <span className="text-[11px] font-mono text-white/40">{originalAssessment.assessed_at}</span>
            </div>

            <div className="text-xs text-white/60 mb-3 flex items-center gap-1.5">
              <span className="text-white/40">Trigger:</span>
              <span className="text-white/80 font-medium">{originalAssessment.trigger}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
              <div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider block">Residual Risk</span>
                <span className="text-lg font-mono font-semibold text-amber-400">
                  {(originalAssessment.residual_risk ?? 0).toFixed(1)}
                  <span className="text-xs text-white/30 font-normal">/100</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider block">Coverage</span>
                <span className="text-lg font-mono font-semibold text-white/80">
                  {Math.round((originalAssessment.risk_weighted_coverage ?? 0) * 100)}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-white/40 uppercase tracking-wider block">Priority</span>
                <span className="text-lg font-mono font-semibold text-white/80">
                  {(originalAssessment.priority_score ?? 0).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Current Assessment Card */}
        <div className={`rounded-lg border p-4 relative ${hasReassessment ? 'border-[#C6613F]/40 bg-[#C6613F]/5' : 'border-white/10 bg-black/40 md:col-span-2'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-medium bg-[#C6613F]/20 text-[#C6613F] border border-[#C6613F]/30">
              <ShieldCheck className="h-3 w-3" /> Current Assessment
            </span>
            <span className="text-[11px] font-mono text-white/50">{effectiveCurrent.assessed_at}</span>
          </div>

          <div className="text-xs text-white/60 mb-3 flex items-center gap-1.5">
            <span className="text-white/40">Trigger:</span>
            <span className="text-white/90 font-medium">{effectiveCurrent.trigger}</span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Residual Risk</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-mono font-semibold text-white">
                  {(effectiveCurrent.residual_risk ?? 0).toFixed(1)}
                  <span className="text-xs text-white/30 font-normal">/100</span>
                </span>
                {hasReassessment && deltaRisk !== 0 && (
                  <span className={`text-xs font-mono font-semibold flex items-center ${deltaRisk < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {deltaRisk < 0 ? <TrendingDown className="h-3 w-3 mr-0.5 inline" /> : <TrendingUp className="h-3 w-3 mr-0.5 inline" />}
                    {deltaRisk > 0 ? `+${deltaRisk}` : deltaRisk}
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Coverage</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-mono font-semibold text-white">
                  {Math.round((effectiveCurrent.risk_weighted_coverage ?? 0) * 100)}%
                </span>
                {hasReassessment && deltaCoverage !== 0 && (
                  <span className="text-xs font-mono font-semibold text-emerald-400">
                    +{deltaCoverage}%
                  </span>
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] text-white/40 uppercase tracking-wider block">Priority</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-mono font-semibold text-white">
                  {(effectiveCurrent.priority_score ?? 0).toFixed(1)}
                </span>
                {hasReassessment && deltaPriority !== 0 && (
                  <span className={`text-xs font-mono font-semibold ${deltaPriority < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {deltaPriority > 0 ? `+${deltaPriority}` : deltaPriority}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Context Revisions Between Assessments */}
      {revisionsBetween.length > 0 && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <span className="text-xs font-medium text-white/60 block mb-2">
            Context Revisions Approved Between Assessments ({revisionsBetween.length}):
          </span>
          <div className="space-y-2">
            {revisionsBetween.map((rev) => (
              <div key={rev.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-black/30 border border-white/5 text-xs">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="font-mono text-white/80 font-medium">{rev.id}</span>
                  <span className="text-white/50 truncate max-w-md">{rev.reason}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-white/40 font-mono">
                  {rev.approver_name && <span>Approved by {rev.approver_name}</span>}
                  <span>{rev.approved_at || rev.created_at}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technical Details Collapsible */}
      {showTechnicalDetails && (
        <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono text-white/50 bg-black/20 p-3 rounded-lg">
          <div>
            <span className="block text-white/30 text-[10px] uppercase">Current Assessment ID</span>
            <span className="text-white/80">{effectiveCurrent.id}</span>
          </div>
          {originalAssessment && (
            <div>
              <span className="block text-white/30 text-[10px] uppercase">Original Assessment ID</span>
              <span className="text-white/80">{originalAssessment.id}</span>
            </div>
          )}
          <div>
            <span className="block text-white/30 text-[10px] uppercase">Scoring Engine Version</span>
            <span className="text-white/80">{effectiveCurrent.scoring_version}</span>
          </div>
          <div>
            <span className="block text-white/30 text-[10px] uppercase">Data Quality Level</span>
            <span className="text-white/80 uppercase">{effectiveCurrent.data_quality}</span>
          </div>
        </div>
      )}
    </div>
  );
};
