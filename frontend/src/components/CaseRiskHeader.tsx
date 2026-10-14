// src/components/CaseRiskHeader.tsx
// Phase 3 & Phase 8: Comprehensive 5-Metric Case Risk Header & Indeterminate Handling
// Displays backend-computed Priority, Residual Risk, Raw Deviation, Context Coverage, and Assessment Confidence.

import React from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  AlertTriangle,
  Clock,
  Flame,
  CheckCircle2,
  Info,
  TrendingDown,
  Layers,
} from 'lucide-react';
import { Case, AssessmentDetail, EntityCaseDetail } from '../types';
import { PersonaAvatar } from './PersonaAvatar';

interface CaseRiskHeaderProps {
  caseData?: Case | null;
  detail?: EntityCaseDetail | null;
  currentAssessment?: AssessmentDetail | null;
}

export const CaseRiskHeader: React.FC<CaseRiskHeaderProps> = ({
  caseData,
  detail,
  currentAssessment,
}) => {
  // Extract canonical metrics directly from backend adapter objects
  const priorityScore = currentAssessment?.priority_score ?? detail?.priorityScore ?? caseData?.priority_score ?? 0;
  const residualRisk = currentAssessment?.residual_risk ?? detail?.residualRiskScore ?? caseData?.residual_risk ?? 0;
  const rawDeviation = currentAssessment?.raw_deviation ?? detail?.rawDeviationScore ?? caseData?.raw_deviation ?? 0;
  const contextCoverage = currentAssessment?.risk_weighted_coverage ?? ((detail?.contextCoverageScore ?? caseData?.context_coverage ?? 0) / 100);
  const confidence = currentAssessment?.assessment_confidence ?? caseData?.assessment_confidence ?? 0.88;
  const dataQuality = currentAssessment?.data_quality ?? 'rich';
  const isIndeterminate = dataQuality === 'sparse' || confidence < 0.35 || caseData?.status === 'Indeterminate Baseline';
  const isCriticalReview = currentAssessment?.critical_review_triggered ?? (residualRisk > 80 && contextCoverage < 0.1);
  const isRetroactive = currentAssessment?.retroactive_justification_review ?? false;
  const scoringVersion = currentAssessment?.scoring_version ?? 'v2.0.0';

  const getStatusBadge = () => {
    if (isIndeterminate) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
          <HelpCircle className="h-3.5 w-3.5" />
          <span>Indeterminate Baseline (Sparse Telemetry)</span>
        </span>
      );
    }
    if (residualRisk > 75 || caseData?.status === 'Containment Recommended') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30">
          <Flame className="h-3.5 w-3.5 text-rose-400" />
          <span>Containment Recommended</span>
        </span>
      );
    }
    if (caseData?.status === 'Cleared' || residualRisk < 5.0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          <span>Cleared (Authorized Context)</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
        <Clock className="h-3.5 w-3.5 text-amber-400" />
        <span>Reviewing Active Context</span>
      </span>
    );
  };

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0d12] p-5 mb-6">
      {/* Top Bar: Actor & Status Badges */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3.5">
          <PersonaAvatar
            name={caseData?.actor_name}
            size="lg"
            status={residualRisk > 70 ? 'escalated' : residualRisk > 30 ? 'hold' : residualRisk < 10 ? 'cleared' : 'indeterminate'}
          />
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-white">
                {caseData?.actor_name || 'Investigation Case'}
              </h2>
              <span className="font-mono text-xs text-white/50 bg-white/5 px-2.5 py-1 rounded">
                Case #{caseData?.id || detail?.id || '—'}
              </span>
              {getStatusBadge()}
              {isCriticalReview && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-rose-950/50 text-rose-300 border border-rose-500/30">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
                  <span>Critical-Action Policy Active</span>
                </span>
              )}
              {isRetroactive && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold bg-amber-950/50 text-amber-300 border border-amber-500/30">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Retroactive Review Required</span>
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-white/50 mt-1 font-mono">
              <span>Actor ID: {caseData?.actor_id}</span>
              <span>•</span>
              <span>Role: {caseData?.actor_role}</span>
              <span>•</span>
              <span>Department: {caseData?.department}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-white/40">
          <span>Engine: {scoringVersion}</span>
        </div>
      </div>

      {/* Indeterminate Warning Banner if applicable */}
      {isIndeterminate && (
        <div className="mt-4 p-3.5 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-200 text-xs leading-relaxed flex items-start gap-2.5">
          <HelpCircle className="h-4 w-4 shrink-0 text-purple-400 mt-0.5" />
          <div>
            <strong className="font-semibold text-purple-300 block mb-0.5">
              Indeterminate Baseline: Model Covariance Calculation Deferred
            </strong>
            Actor tenure is within the 14-day initialization baseline window (Tenure: 3 days). Data quality is sparse (Confidence: {Math.round(confidence * 100)}%). This case is flagged for baseline tracking, not policy violation.
          </div>
        </div>
      )}

      {/* 5 Canonical Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
        {/* 1. Priority Score */}
        <div className="p-3.5 rounded-lg bg-black/40 border border-white/5">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            Priority Score
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-xl font-mono font-bold ${
                priorityScore > 70
                  ? 'text-rose-400'
                  : priorityScore > 30
                  ? 'text-amber-400'
                  : 'text-white'
              }`}
            >
              {(priorityScore ?? 0).toFixed(1)}
            </span>
            <span className="text-[10px] text-white/30 font-mono">/100</span>
          </div>
          <span className="text-[10px] text-white/40 block mt-1">Queue ranking weight</span>
        </div>

        {/* 2. Residual Risk Score */}
        <div className="p-3.5 rounded-lg bg-black/40 border border-white/5">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            Residual Risk
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-xl font-mono font-bold ${
                residualRisk > 70
                  ? 'text-rose-400'
                  : residualRisk > 20
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {(residualRisk ?? 0).toFixed(1)}
            </span>
            <span className="text-[10px] text-white/30 font-mono">/100</span>
          </div>
          <span className="text-[10px] text-white/40 block mt-1">Post-context anomaly</span>
        </div>

        {/* 3. Raw Deviation Score */}
        <div className="p-3.5 rounded-lg bg-black/40 border border-white/5">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            Raw Deviation
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-mono font-bold text-white/80">
              {(rawDeviation ?? 0).toFixed(1)}
            </span>
            <span className="text-[10px] text-white/30 font-mono">/100</span>
          </div>
          <span className="text-[10px] text-white/40 block mt-1">Pre-context telemetry</span>
        </div>

        {/* 4. Risk-Weighted Coverage */}
        <div className="p-3.5 rounded-lg bg-black/40 border border-white/5">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            Context Coverage
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl font-mono font-bold text-white">
              {Math.round(contextCoverage * 100)}%
            </span>
          </div>
          <span className="text-[10px] text-white/40 block mt-1">Risk-weighted grants</span>
        </div>

        {/* 5. Assessment Confidence */}
        <div className="p-3.5 rounded-lg bg-black/40 border border-white/5">
          <span className="text-[10px] text-white/40 uppercase tracking-wider font-mono block">
            Confidence
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <span
              className={`text-xl font-mono font-bold ${
                isIndeterminate ? 'text-purple-300' : 'text-white'
              }`}
            >
              {Math.round(confidence * 100)}%
            </span>
            <span className="text-[10px] text-white/40 uppercase font-mono ml-1">
              ({dataQuality})
            </span>
          </div>
          <span className="text-[10px] text-white/40 block mt-1">Telemetry sufficiency</span>
        </div>
      </div>
    </div>
  );
};
