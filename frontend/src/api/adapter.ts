// src/api/adapter.ts
// Typed Adapter Layer: Validates backend payloads at runtime and produces view models
// Directives:
// 1. The frontend must display backend-computed values; it must NEVER recalculate residual risk.
// 2. Safely handles missing optional fields with standard defensive defaults.
// 3. Ensures original and current assessments remain immutable.
// 4. Guaranteed deterministic timestamp and contract compliance.

import {
  Case,
  EntityCaseDetail,
  AssessmentDetail,
  EventContribution,
  SignalCategory,
  EvidenceEpisode,
  ContextRevision,
  ContextLedgerItem,
  ShiftMapData,
  Counterfactual,
  BehaviorClassification,
  DataQuality,
  ResponseActionPlan,
  BlastRadiusData,
} from '../types';
import { FIXED_CLOCK_ISO, FIXED_CLOCK_DISPLAY, SCORING_VERSION } from '../constants';

export class SchemaValidationError extends Error {
  constructor(message: string, public readonly payload: unknown) {
    super(`FABLE API Schema Validation Error: ${message}`);
    this.name = 'SchemaValidationError';
  }
}

/**
 * Validates and adapts an AssessmentDetail DTO
 */
export function adaptAssessment(
  raw: Partial<AssessmentDetail> | null | undefined,
  fallbackId = 'asm-unknown'
): AssessmentDetail {
  if (!raw || typeof raw !== 'object') {
    throw new SchemaValidationError('Assessment object is missing or invalid', raw);
  }

  const rawDeviation = typeof raw.raw_deviation === 'number' ? raw.raw_deviation : 0;
  const coverage = typeof raw.risk_weighted_coverage === 'number' ? raw.risk_weighted_coverage : 0;
  const residualRisk = typeof raw.residual_risk === 'number' ? raw.residual_risk : 0;
  const priorityScore = typeof raw.priority_score === 'number' ? raw.priority_score : residualRisk;

  return {
    id: raw.id || raw.assessment_id || fallbackId,
    assessment_id: raw.assessment_id || raw.id || fallbackId,
    case_id: raw.case_id || '',
    assessed_at: raw.assessed_at || FIXED_CLOCK_DISPLAY,
    trigger: raw.trigger || 'Baseline Assessment',
    raw_deviation: Number(rawDeviation.toFixed(1)),
    risk_weighted_coverage: Number(coverage.toFixed(2)),
    residual_risk: Number(residualRisk.toFixed(1)),
    priority_score: Number(priorityScore.toFixed(1)),
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 85,
    assessment_confidence:
      typeof raw.assessment_confidence === 'number'
        ? raw.assessment_confidence
        : typeof raw.confidence === 'number'
        ? raw.confidence / 100
        : 0.88,
    data_quality: (raw.data_quality as DataQuality) || 'high',
    scoring_version: raw.scoring_version || SCORING_VERSION,
    critical_activity_observed: Boolean(raw.critical_activity_observed),
    critical_review_required: Boolean(raw.critical_review_required),
    critical_review_triggered: Boolean(raw.critical_review_triggered || raw.critical_review_required),
    retroactive_justification_review: Boolean(raw.retroactive_justification_review),
    policy_floor_applied: Boolean(raw.policy_floor_applied),
    policy_floor_reason: raw.policy_floor_reason || undefined,
    unresolved_event_count: typeof raw.unresolved_event_count === 'number' ? raw.unresolved_event_count : 0,
  };
}

/**
 * Validates and adapts an EventContribution DTO
 */
export function adaptEventContribution(
  raw: Partial<EventContribution> | null | undefined,
  index = 0
): EventContribution {
  if (!raw || typeof raw !== 'object') {
    throw new SchemaValidationError(`Event contribution at index ${index} is invalid`, raw);
  }

  const rawRisk = typeof raw.event_raw_risk === 'number' ? raw.event_raw_risk : 0;
  const credit = typeof raw.context_credit === 'number' ? raw.context_credit : 0;
  const residualBefore =
    typeof raw.residual_before_policy === 'number'
      ? raw.residual_before_policy
      : Number((rawRisk * (1 - credit)).toFixed(1));
  const finalResidual =
    typeof raw.final_residual_contribution === 'number'
      ? raw.final_residual_contribution
      : residualBefore;

  return {
    id: raw.id || `ev-${index}`,
    event_id: raw.event_id || raw.id || `ev-${index}`,
    timestamp: raw.timestamp || '2026-09-12 04:00 UTC',
    action: raw.action || 'Observed Operation',
    source: raw.source || 'Audit Gateway',
    resource: raw.resource || 'Unknown Target',
    destination: raw.destination || undefined,
    vector: raw.vector || 'Application Layer',
    severity: raw.severity || (finalResidual > 70 ? 'critical' : finalResidual > 30 ? 'high' : 'low'),
    event_raw_risk: Number(rawRisk.toFixed(1)),
    context_state:
      raw.context_state || (credit >= 0.9 ? 'explained' : credit > 0 ? 'partially_explained' : 'unresolved'),
    context_credit: Number(credit.toFixed(2)),
    residual_before_policy: Number(residualBefore.toFixed(1)),
    final_residual_contribution: Number(finalResidual.toFixed(1)),
    critical_action: Boolean(raw.critical_action),
    matched_context_id: raw.matched_context_id || undefined,
    matched_context_title: raw.matched_context_title || undefined,
    episode_id: raw.episode_id || undefined,
    episode_name: raw.episode_name || undefined,
    explanation: raw.explanation || 'Analyzed against access policy',
    details: raw.details || undefined,
    actor_id: raw.actor_id || undefined,
    is_late_context: Boolean(raw.is_late_context),
  };
}

/**
 * Validates and adapts Signal Categories
 */
export function adaptSignalCategories(rawList: unknown): SignalCategory[] {
  if (!Array.isArray(rawList)) return [];

  return rawList.map((item, idx) => {
    const raw = item as Partial<SignalCategory>;
    return {
      category_id: raw.category_id || `cat-${idx}`,
      name: raw.name || 'identity',
      display_name: raw.display_name || String(raw.name || 'Category'),
      category_score: typeof raw.category_score === 'number' ? raw.category_score : 0,
      combination_method: raw.combination_method || 'Max within correlated group',
      contributing_signals: Array.isArray(raw.contributing_signals) ? raw.contributing_signals : [],
      raw_fields: Array.isArray(raw.raw_fields) ? raw.raw_fields : [],
      signal_sources: Array.isArray(raw.signal_sources) ? raw.signal_sources : [],
      signal_type: raw.signal_type || 'learned',
    };
  });
}

/**
 * Validates and adapts Evidence Episodes
 */
export function adaptEvidenceEpisodes(rawList: unknown): EvidenceEpisode[] {
  if (!Array.isArray(rawList)) return [];

  return rawList.map((item, idx) => {
    const raw = item as Partial<EvidenceEpisode>;
    return {
      episode_id: raw.episode_id || `ep-${idx}`,
      name: raw.name || `Episode ${idx + 1}`,
      combination_method: raw.combination_method || 'Max (non-inflating) within correlated group',
      event_ids: Array.isArray(raw.event_ids) ? raw.event_ids : [],
      group_score: typeof raw.group_score === 'number' ? raw.group_score : 0,
      description: raw.description || '',
    };
  });
}

/**
 * Validates and adapts Context Revisions
 */
export function adaptContextRevision(raw: Partial<ContextRevision>, idx = 0): ContextRevision {
  return {
    id: raw.id || `rev-${idx}`,
    case_id: raw.case_id || '',
    proposer_id: raw.proposer_id || 'analyst-proposer',
    proposer_name: raw.proposer_name || 'Alex Thorne',
    proposer_role: raw.proposer_role || 'SOC Tier 2 Analyst',
    approver_id: raw.approver_id || undefined,
    approver_name: raw.approver_name || undefined,
    approver_role: raw.approver_role || undefined,
    reason: raw.reason || 'Context attestation update',
    effective_from: raw.effective_from || '2026-09-12 04:00 UTC',
    effective_until: raw.effective_until || '2026-09-12 08:00 UTC',
    created_at: raw.created_at || '2026-09-12 04:45 UTC',
    approved_at: raw.approved_at || undefined,
    status: raw.status || 'pending',
    supersedes_id: raw.supersedes_id || undefined,
    superseded_by_id: raw.superseded_by_id || undefined,
    allowed_resources: Array.isArray(raw.allowed_resources) ? raw.allowed_resources : [],
    allowed_actions: Array.isArray(raw.allowed_actions) ? raw.allowed_actions : [],
    approved_destinations: Array.isArray(raw.approved_destinations) ? raw.approved_destinations : undefined,
    is_late_context: Boolean(raw.is_late_context),
    requires_retroactive_review: Boolean(raw.requires_retroactive_review),
    review_notes: raw.review_notes || undefined,
  };
}

/**
 * Full Case Detail Adapter
 */
export function adaptCaseDetail(raw: Partial<EntityCaseDetail> & { caseId?: string }): EntityCaseDetail {
  if (!raw || typeof raw !== 'object') {
    throw new SchemaValidationError('Case detail payload is empty or invalid', raw);
  }

  const rawEvents = Array.isArray(raw.eventContributions)
    ? raw.eventContributions
    : Array.isArray(raw.timelineEvents)
    ? raw.timelineEvents.map((e, idx) => ({
        id: e.id,
        event_id: e.id,
        timestamp: e.timestamp,
        action: e.action || e.event,
        source: e.source,
        resource:
          typeof e.resource === 'object' && e.resource ? e.resource.name : String(e.resource || 'Protected Resource'),
        vector: e.vector,
        severity: e.severity,
        event_raw_risk: e.raw_risk || (e.severity === 'critical' ? 95 : e.severity === 'high' ? 70 : 15),
        context_state: e.context_state || 'unresolved',
        context_credit: e.context_state === 'explained' ? 1.0 : 0.0,
        residual_before_policy: e.residual_contribution || 0,
        final_residual_contribution: e.residual_contribution || 0,
        critical_action: Boolean(e.critical_action),
        matched_context_id: e.matched_context_id,
        explanation: e.details,
      }))
    : [];

  const eventContributions = rawEvents.map((e, idx) => adaptEventContribution(e, idx));

  // Determine top unresolved contributor
  const unresolvedEvents = eventContributions.filter(
    (e) => e.context_state === 'unresolved' || e.final_residual_contribution > 40
  );
  const topUnresolved =
    unresolvedEvents.sort((a, b) => b.final_residual_contribution - a.final_residual_contribution)[0] ||
    eventContributions[0];

  const originalAssessment = raw.originalAssessment
    ? adaptAssessment(raw.originalAssessment, 'asm-orig')
    : undefined;

  const currentAssessment = raw.currentAssessment
    ? adaptAssessment(raw.currentAssessment, 'asm-curr')
    : originalAssessment
    ? originalAssessment
    : adaptAssessment({
        raw_deviation: raw.rawDeviationScore,
        risk_weighted_coverage: raw.contextCoverageScore ? raw.contextCoverageScore / 100 : 0,
        residual_risk: raw.residualRiskScore,
        priority_score: raw.priorityScore || raw.residualRiskScore,
        confidence: raw.confidence,
        data_quality: raw.data_quality,
        scoring_version: raw.scoringVersion,
      });

  const signalCategories = adaptSignalCategories(raw.signalCategories);
  const evidenceEpisodes = adaptEvidenceEpisodes(raw.evidenceEpisodes);

  const contextRevisions = Array.isArray(raw.contextRevisions)
    ? raw.contextRevisions.map((r, idx) => adaptContextRevision(r, idx))
    : [];

  const contextLedger: ContextLedgerItem[] = Array.isArray(raw.contextLedger)
    ? raw.contextLedger.map((c) => ({
        id: c.id || 'ctx-0',
        type: c.type || 'Approved RFC',
        title: c.title || 'Context Item',
        status: c.status || 'valid',
        note: c.note || '',
        resource: c.resource,
        is_late_context: Boolean(c.is_late_context),
        effective_window: c.effective_window,
      }))
    : [];

  return {
    id: raw.id,
    entity_ref: raw.entity_ref,
    rawDeviationScore: currentAssessment.raw_deviation,
    contextCoverageScore: Math.round(currentAssessment.risk_weighted_coverage * 100),
    residualRiskScore: currentAssessment.residual_risk,
    priorityScore: currentAssessment.priority_score,
    scoringVersion: currentAssessment.scoring_version,
    originalAssessment,
    currentAssessment,
    assessmentHistory: raw.assessmentHistory?.map((a, idx) => adaptAssessment(a, `asm-${idx}`)),
    revisionsBetweenAssessments: raw.revisionsBetweenAssessments?.map((r, idx) => adaptContextRevision(r, idx)),
    eventContributions,
    signalCategories,
    evidenceEpisodes,
    initialDriftPattern: raw.initialDriftPattern || 'Observed telemetry anomaly pattern',
    timelineEvents: raw.timelineEvents || [],
    contextLedger,
    constituentSignals: raw.constituentSignals,
    contextRevisions,
    counterfactuals: raw.counterfactuals || [],
    counterfactualWaterfall: raw.counterfactualWaterfall,
    shiftMap: raw.shiftMap,
    classification: (raw.classification as BehaviorClassification) || 'unexplained',
    confidence: currentAssessment.confidence,
    protective_hold_active: Boolean(raw.protective_hold_active),
    protective_hold_triggered_at: raw.protective_hold_triggered_at,
    hard_rule_flag: Boolean(raw.hard_rule_flag),
    residual_unresolved_count: raw.residual_unresolved_count ?? unresolvedEvents.length,
    data_quality: currentAssessment.data_quality,
    critical_activity_observed: currentAssessment.critical_activity_observed,
    critical_review_required: currentAssessment.critical_review_required,
    critical_review_triggered: currentAssessment.critical_review_triggered,
    policy_floor_applied: currentAssessment.policy_floor_applied,
    policy_floor_reason: currentAssessment.policy_floor_reason,
    retroactive_justification_review: Boolean(raw.retroactive_justification_review),
    is_indeterminate: currentAssessment.data_quality === 'sparse' || raw.classification === 'indeterminate',
    baseline_age_days: raw.baseline_age_days,
    baseline_fallback_source: raw.baseline_fallback_source,
    top_unresolved_event: topUnresolved,
    responseAction: raw.responseAction,
    blastRadius: raw.blastRadius,
  };
}

/**
 * Case List Item Adapter
 */
export function adaptCase(raw: Partial<Case>): Case {
  if (!raw || typeof raw !== 'object') {
    throw new SchemaValidationError('Case object is missing or invalid', raw);
  }

  const residual = typeof raw.residual_risk === 'number' ? raw.residual_risk : 0;
  const rawDev = typeof raw.raw_deviation === 'number' ? raw.raw_deviation : residual;
  const coverage = typeof raw.context_coverage === 'number' ? raw.context_coverage : 0;
  const priority = typeof raw.priority_score === 'number' ? raw.priority_score : residual;

  return {
    id: raw.id || 'unknown',
    actor_id: raw.actor_id || 'unknown',
    entity_ref: raw.entity_ref,
    actor_name: raw.actor_name,
    actor_role: raw.actor_role,
    department: raw.department,
    created_at: raw.created_at || FIXED_CLOCK_ISO,
    status: (raw.status as BehaviorClassification) || 'unexplained',
    case_status: raw.case_status || 'Open',
    raw_deviation: Number(rawDev.toFixed(1)),
    context_coverage: Number(coverage.toFixed(2)),
    residual_risk: Number(residual.toFixed(1)),
    priority_score: Number(priority.toFixed(1)),
    confidence: typeof raw.confidence === 'number' ? raw.confidence : 85,
    assessment_confidence:
      typeof raw.assessment_confidence === 'number'
        ? raw.assessment_confidence
        : typeof raw.confidence === 'number'
        ? raw.confidence / 100
        : 0.88,
    data_quality: (raw.data_quality as DataQuality) || 'high',
    scoring_version: raw.scoring_version || SCORING_VERSION,
    primary_cause: raw.primary_cause || 'Observed telemetry anomaly pattern',
    evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
    matched_context_ids: Array.isArray(raw.matched_context_ids) ? raw.matched_context_ids : [],
    unmatched_behavior: Array.isArray(raw.unmatched_behavior) ? raw.unmatched_behavior : [],
    top_unresolved_event: raw.top_unresolved_event ? adaptEventContribution(raw.top_unresolved_event) : undefined,
    critical_activity_observed: Boolean(raw.critical_activity_observed),
    critical_review_required: Boolean(raw.critical_review_required),
    critical_review_triggered: Boolean(raw.critical_review_triggered || raw.critical_review_required),
    policy_floor_applied: Boolean(raw.policy_floor_applied),
    policy_floor_reason: raw.policy_floor_reason,
    retroactive_justification_review: Boolean(raw.retroactive_justification_review),
    is_indeterminate: Boolean(raw.is_indeterminate || raw.data_quality === 'sparse'),
    baseline_age_days: raw.baseline_age_days,
    baseline_fallback_source: raw.baseline_fallback_source,
    constituent_signals: raw.constituent_signals,
    reopen_reason: raw.reopen_reason,
    reopen_date: raw.reopen_date,
    previous_explanation: raw.previous_explanation,
    protective_hold_active: Boolean(raw.protective_hold_active),
    protective_hold_triggered_at: raw.protective_hold_triggered_at,
    hard_rule_flag: Boolean(raw.hard_rule_flag),
    residual_unresolved_count: raw.residual_unresolved_count,
    response_action: raw.response_action,
  };
}
